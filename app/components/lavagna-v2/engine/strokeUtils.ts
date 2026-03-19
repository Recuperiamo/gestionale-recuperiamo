// @ts-nocheck
/**
 * strokeUtils.ts — Pure utility functions for stroke geometry.
 * No React, no side-effects. Safe to import anywhere.
 */

export interface Point { x: number; y: number; p?: number } // p = pressure 0-1
export interface BBox { minX: number; minY: number; maxX: number; maxY: number }

export interface Stroke {
  id: string
  streamId?: string
  dbId?: number | string
  tool: 'pen' | 'highlighter' | 'eraser'
  color: string
  width: number
  points: Point[]
  opacity: number
  bbox?: BBox
  authorId?: string | number
}

export interface Shape {
  id: string
  dbId?: number | string
  type: 'rect' | 'ellipse' | 'line' | 'arrow' | 'triangle' | 'diamond' | 'text' | 'image'
  x: number; y: number; x2?: number; y2?: number
  width?: number; height?: number
  color: string
  fillColor?: string
  strokeWidth: number
  text?: string
  fontSize?: number
  fontFamily?: string
  imageUrl?: string
  rotation?: number
  locked?: boolean
  authorId?: string | number
  bbox?: BBox
}

// ─── Bounding Box ────────────────────────────────────────────────────────────

export function strokeBBox(pts: Point[]): BBox {
  if (!pts.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  let minX = pts[0].x, minY = pts[0].y, maxX = pts[0].x, maxY = pts[0].y
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].x < minX) minX = pts[i].x
    if (pts[i].y < minY) minY = pts[i].y
    if (pts[i].x > maxX) maxX = pts[i].x
    if (pts[i].y > maxY) maxY = pts[i].y
  }
  return { minX, minY, maxX, maxY }
}

export function expandBBox(bb: BBox, px: number): BBox {
  return { minX: bb.minX - px, minY: bb.minY - px, maxX: bb.maxX + px, maxY: bb.maxY + px }
}

export function bboxIntersects(a: BBox, b: BBox): boolean {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY)
}

export function pointInBBox(p: Point, bb: BBox): boolean {
  return p.x >= bb.minX && p.x <= bb.maxX && p.y >= bb.minY && p.y <= bb.maxY
}

// ─── Geometry ────────────────────────────────────────────────────────────────

export function distPointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

export function hitTestStroke(stroke: Stroke, wx: number, wy: number, zoom: number): boolean {
  const pts = stroke.points
  if (!pts || pts.length < 2) {
    if (pts?.length === 1) return Math.hypot(wx - pts[0].x, wy - pts[0].y) < (stroke.width + 4) / zoom
    return false
  }
  const threshold = Math.max(stroke.width / 2 + 4, 8) / zoom
  const bb = stroke.bbox || strokeBBox(pts)
  if (!pointInBBox({ x: wx, y: wy }, expandBBox(bb, threshold))) return false
  for (let i = 0; i < pts.length - 1; i++) {
    if (distPointToSegment(wx, wy, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= threshold) return true
  }
  return false
}

/** Hit-test a shape at world-space point (wx, wy).
 *  Uses an expanded bbox with a radius proportional to zoom. */
export function hitTestShape(shape: Shape, wx: number, wy: number, zoom: number): boolean {
  const pad = Math.max(8, (shape.strokeWidth || 2) * 1.5) / zoom
  const bb = shapeBBox(shape)
  return (
    wx >= bb.minX - pad && wx <= bb.maxX + pad &&
    wy >= bb.minY - pad && wy <= bb.maxY + pad
  )
}

export function shapeBBox(s: Shape): BBox {
  const hw = (s.strokeWidth || 1) / 2
  if (s.type === 'line' || s.type === 'arrow') {
    return {
      minX: Math.min(s.x, s.x2 ?? s.x) - hw,
      minY: Math.min(s.y, s.y2 ?? s.y) - hw,
      maxX: Math.max(s.x, s.x2 ?? s.x) + hw,
      maxY: Math.max(s.y, s.y2 ?? s.y) + hw,
    }
  }
  if (s.type === 'text') {
    const fontSize = s.fontSize || 18
    const lines = (s.text || '').split('\n')
    const w = Math.max(...lines.map(l => l.length), 1) * fontSize * 0.6
    const h = lines.length * fontSize * 1.4
    return { minX: s.x - 4, minY: s.y - 4, maxX: s.x + w + 4, maxY: s.y + h + 4 }
  }
  const w = s.width ?? 0, h = s.height ?? 0
  if (!s.rotation) {
    return { minX: s.x - hw, minY: s.y - hw, maxX: s.x + w + hw, maxY: s.y + h + hw }
  }
  const cx = s.x + w / 2, cy = s.y + h / 2
  const cos = Math.abs(Math.cos(s.rotation)), sin = Math.abs(Math.sin(s.rotation))
  const rw = (w * cos + h * sin) / 2, rh = (w * sin + h * cos) / 2
  return { minX: cx - rw - hw, minY: cy - rh - hw, maxX: cx + rw + hw, maxY: cy + rh + hw }
}

// ─── Smoothing ───────────────────────────────────────────────────────────────

/** Chaikin subdivision — rounds corners */
export function chaikin(pts: Point[], iterations = 2): Point[] {
  let p = pts
  for (let iter = 0; iter < iterations; iter++) {
    const out: Point[] = [p[0]]
    for (let i = 0; i < p.length - 1; i++) {
      out.push({ x: p[i].x * 0.75 + p[i + 1].x * 0.25, y: p[i].y * 0.75 + p[i + 1].y * 0.25 })
      out.push({ x: p[i].x * 0.25 + p[i + 1].x * 0.75, y: p[i].y * 0.25 + p[i + 1].y * 0.75 })
    }
    out.push(p[p.length - 1])
    p = out
  }
  return p
}

/** Remove duplicate/near-duplicate points, then smooth */
export function simplifyPoints(raw: Point[], zoom = 1): Point[] {
  if (raw.length <= 2) return raw
  const minDist = Math.max(0.5, 1.5 / zoom)
  const deduped: Point[] = [raw[0]]
  for (let i = 1; i < raw.length; i++) {
    const prev = deduped[deduped.length - 1]
    if (Math.hypot(raw[i].x - prev.x, raw[i].y - prev.y) >= minDist) deduped.push(raw[i])
  }
  if (deduped.length <= 2) return deduped
  return chaikin(deduped, 1)
}

// ─── Coordinate helpers ──────────────────────────────────────────────────────

export function screenToWorld(sx: number, sy: number, pan: { x: number; y: number }, zoom: number): Point {
  return { x: sx / zoom + pan.x, y: sy / zoom + pan.y }
}

export function worldToScreen(wx: number, wy: number, pan: { x: number; y: number }, zoom: number): Point {
  return { x: (wx - pan.x) * zoom, y: (wy - pan.y) * zoom }
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function prepareStroke(raw: Partial<Stroke>): Stroke {
  const pts = raw.points || []
  return {
    ...raw,
    points: pts,
    bbox: strokeBBox(pts),
  } as Stroke
}
