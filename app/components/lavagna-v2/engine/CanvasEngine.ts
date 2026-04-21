// @ts-nocheck
/**
 * CanvasEngine — imperative canvas renderer.
 *
 * Architecture: TWO canvas layers stacked:
 *   1. baseCanvas  — committed strokes/shapes (redrawn only when data changes)
 *   2. liveCanvas  — current in-progress stroke + remote cursors (redrawn every ~16ms)
 *
 * Viewport (pan/zoom) is pure JS state — never goes through React setState,
 * so panning/zooming causes zero React re-renders.
 */
import { Stroke, Shape, Point, BBox, strokeBBox, simplifyPoints, shapeBBox, worldToScreen } from './strokeUtils'
import { Background } from '../store/whiteboardStore'

export interface Viewport { pan: { x: number; y: number }; zoom: number }

export interface LiveStroke {
  id: string
  tool: string
  color: string
  width: number
  opacity: number
  points: Point[]
}

export interface RemoteCursorRender {
  userId: string
  role: string
  x: number; y: number
}

export type EngineListener = (event: 'viewport' | 'dirty') => void

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawStrokePath(ctx: CanvasRenderingContext2D, pts: Point[], width: number) {
  if (pts.length === 0) return
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (pts.length === 1) {
    ctx.beginPath()
    ctx.arc(pts[0].x, pts[0].y, width / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2
    const my = (pts[i].y + pts[i + 1].y) / 2
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
  ctx.stroke()
}

function drawBackground(ctx: CanvasRenderingContext2D, bg: Background, pan: { x: number; y: number }, zoom: number, cssW: number, cssH: number) {
  // fill base color
  ctx.fillStyle = bg === 'black' ? '#1a1a1a' : '#ffffff'
  ctx.fillRect(0, 0, cssW, cssH)

  if (bg === 'white' || bg === 'black') return

  const step = 32
  const dotR = 1
  const lineColor = bg === 'black' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'
  const dotColor = bg === 'black' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.20)'

  // offset for infinite scroll
  const ox = ((-pan.x * zoom) % (step * zoom) + step * zoom) % (step * zoom)
  const oy = ((-pan.y * zoom) % (step * zoom) + step * zoom) % (step * zoom)

  ctx.save()
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 1

  if (bg === 'grid') {
    for (let x = ox - step * zoom; x < cssW + step * zoom; x += step * zoom) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cssH); ctx.stroke()
    }
    for (let y = oy - step * zoom; y < cssH + step * zoom; y += step * zoom) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cssW, y); ctx.stroke()
    }
  } else if (bg === 'lines') {
    for (let y = oy - step * zoom; y < cssH + step * zoom; y += step * zoom) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cssW, y); ctx.stroke()
    }
  } else if (bg === 'dots') {
    ctx.fillStyle = dotColor
    for (let x = ox - step * zoom; x < cssW + step * zoom; x += step * zoom) {
      for (let y = oy - step * zoom; y < cssH + step * zoom; y += step * zoom) {
        ctx.beginPath(); ctx.arc(x, y, dotR, 0, Math.PI * 2); ctx.fill()
      }
    }
  }
  ctx.restore()
}

function applyTransform(ctx: CanvasRenderingContext2D, pan: { x: number; y: number }, zoom: number, dpr: number) {
  ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, -pan.x * zoom * dpr, -pan.y * zoom * dpr)
}

function drawSingleStroke(ctx: CanvasRenderingContext2D, s: Stroke, bg: Background) {
  if (!s.points.length) return
  ctx.save()

  if (s.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.fillStyle = 'rgba(0,0,0,1)'
    drawStrokePath(ctx, s.points, s.width)
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = s.opacity ?? 1
    ctx.strokeStyle = s.color
    ctx.fillStyle = s.color
    drawStrokePath(ctx, s.points, s.width)
  }
  ctx.restore()
}

function _drawAxisArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, sw: number, color: string) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const hl = Math.max(10, (sw ?? 2) * 4)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = sw ?? 2
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2 - hl * 0.85 * Math.cos(angle), y2 - hl * 0.85 * Math.sin(angle))
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - hl * Math.cos(angle - 0.42), y2 - hl * Math.sin(angle - 0.42))
  ctx.lineTo(x2 - hl * Math.cos(angle + 0.42), y2 - hl * Math.sin(angle + 0.42))
  ctx.closePath()
  ctx.fill()
}

function drawShape(ctx: CanvasRenderingContext2D, s: Shape, imageCache?: Map<string, HTMLImageElement>, onImageLoad?: () => void) {
  ctx.save()
  ctx.strokeStyle = s.color
  ctx.fillStyle = s.fillColor || 'transparent'
  ctx.lineWidth = s.strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalCompositeOperation = 'source-over'

  const cx = s.x + (s.width ?? 0) / 2
  const cy = s.y + (s.height ?? 0) / 2
  if (s.rotation) {
    ctx.translate(cx, cy)
    ctx.rotate(s.rotation)
    ctx.translate(-cx, -cy)
  }

  if (s.type === 'rect') {
    if (s.fillColor && s.fillColor !== 'transparent') ctx.fillRect(s.x, s.y, s.width, s.height)
    ctx.strokeRect(s.x, s.y, s.width, s.height)
  } else if (s.type === 'ellipse') {
    ctx.beginPath()
    ctx.ellipse(cx, cy, Math.abs(s.width / 2), Math.abs(s.height / 2), 0, 0, Math.PI * 2)
    if (s.fillColor && s.fillColor !== 'transparent') ctx.fill()
    ctx.stroke()
  } else if (s.type === 'line') {
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x2 ?? s.x, s.y2 ?? s.y); ctx.stroke()
  } else if (s.type === 'arrow') {
    const tx = s.x2 ?? s.x, ty = s.y2 ?? s.y
    const angle = Math.atan2(ty - s.y, tx - s.x)
    const hl = Math.max(12, s.strokeWidth * 4)
    // Stop shaft before tip so it doesn't poke through the filled head
    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.lineTo(tx - hl * 0.85 * Math.cos(angle), ty - hl * 0.85 * Math.sin(angle))
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(tx - hl * Math.cos(angle - 0.42), ty - hl * Math.sin(angle - 0.42))
    ctx.lineTo(tx - hl * Math.cos(angle + 0.42), ty - hl * Math.sin(angle + 0.42))
    ctx.closePath()
    ctx.fillStyle = s.color; ctx.fill()
  } else if (s.type === 'diamond') {
    const mx = s.x + s.width / 2, my = s.y + s.height / 2
    ctx.beginPath()
    ctx.moveTo(mx, s.y); ctx.lineTo(s.x + s.width, my); ctx.lineTo(mx, s.y + s.height); ctx.lineTo(s.x, my)
    ctx.closePath()
    if (s.fillColor && s.fillColor !== 'transparent') ctx.fill()
    ctx.stroke()
  } else if (s.type === 'triangle') {
    ctx.beginPath()
    ctx.moveTo(s.x + s.width / 2, s.y)
    ctx.lineTo(s.x + s.width, s.y + s.height)
    ctx.lineTo(s.x, s.y + s.height)
    ctx.closePath()
    if (s.fillColor && s.fillColor !== 'transparent') ctx.fill()
    ctx.stroke()
  } else if (s.type === 'axis2') {
    const ox = s.x, oy = s.y + (s.height ?? 80)  // origin: bottom-left
    const ex = s.x + (s.width ?? 80), ey = oy     // X endpoint
    const ux = ox, uy = s.y                        // Y endpoint (up)
    _drawAxisArrow(ctx, ox, oy, ex, ey, s.strokeWidth, s.color)
    _drawAxisArrow(ctx, ox, oy, ux, uy, s.strokeWidth, s.color)
    const ls = Math.max(10, (s.strokeWidth ?? 2) * 3)
    ctx.font = `italic bold ${ls}px serif`
    ctx.fillStyle = s.color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    ctx.fillText('x', ex + ls * 0.3, ey)
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ctx.fillText('y', ux, uy - ls * 0.2)
  } else if (s.type === 'axis3') {
    const w = s.width ?? 80, h = s.height ?? 80
    const ox = s.x + w * 0.38, oy = s.y + h * 0.72  // origin
    const ex = s.x + w, ey = oy                       // X → right
    const ux = ox, uy = s.y                            // Y → up
    const zx = s.x, zy = s.y + h                      // Z → lower-left
    _drawAxisArrow(ctx, ox, oy, ex, ey, s.strokeWidth, s.color)
    _drawAxisArrow(ctx, ox, oy, ux, uy, s.strokeWidth, s.color)
    _drawAxisArrow(ctx, ox, oy, zx, zy, s.strokeWidth, s.color)
    const ls = Math.max(10, (s.strokeWidth ?? 2) * 3)
    ctx.font = `italic bold ${ls}px serif`
    ctx.fillStyle = s.color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    ctx.fillText('x', ex + ls * 0.3, ey)
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ctx.fillText('y', ux, uy - ls * 0.2)
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'
    ctx.fillText('z', zx - ls * 0.2, zy + ls * 0.2)
  } else if (s.type === 'text' && s.text) {
    ctx.font = `${s.fontSize || 18}px ${s.fontFamily || 'Inter, sans-serif'}`
    ctx.fillStyle = s.color
    ctx.globalAlpha = 1
    ctx.textBaseline = 'top'
    const lines = s.text.split('\n')
    const lineH = (s.fontSize || 18) * 1.4
    lines.forEach((line, i) => ctx.fillText(line, s.x, s.y + i * lineH))
  } else if (s.type === 'image' && s.imageUrl) {
    const url = s.imageUrl
    let img = imageCache?.get(url)
    if (!img) {
      img = new Image()
      // Non impostare crossOrigin per data URL: su alcuni browser Windows
      // causa canvas "tainted" e impedisce il rendering dell'immagine
      if (!url.startsWith('data:')) img.crossOrigin = 'anonymous'
      img.onload = () => onImageLoad?.()
      img.src = url
      imageCache?.set(url, img)
    }
    const w = s.width ?? 200, h = s.height ?? 150
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, s.x, s.y, w, h)
    } else {
      // Placeholder while loading
      ctx.fillStyle = '#e5e7eb'
      ctx.fillRect(s.x, s.y, w, h)
      ctx.strokeStyle = '#9ca3af'
      ctx.lineWidth = 1
      ctx.strokeRect(s.x, s.y, w, h)
    }
  }
  ctx.restore()
}

// ─── CanvasEngine ─────────────────────────────────────────────────────────────

export class CanvasEngine {
  private baseCanvas: HTMLCanvasElement
  private liveCanvas: HTMLCanvasElement
  private baseCtx: CanvasRenderingContext2D
  private liveCtx: CanvasRenderingContext2D
  private contentCanvas: HTMLCanvasElement
  private contentCtx: CanvasRenderingContext2D
  private dpr: number

  // Viewport — pure refs, never React state
  pan = { x: 0, y: 0 }
  zoom = 1

  // Data references (set by shell component)
  strokes: Stroke[] = []
  shapes: Shape[] = []
  background: Background = 'white'

  // Live state
  liveStroke: LiveStroke | null = null
  liveShape: { type: string; x: number; y: number; x2: number; y2: number; color: string; strokeWidth: number } | null = null
  remoteCursors: RemoteCursorRender[] = []

  // Internal
  private baseDirty = true
  private liveRafId: number | null = null
  private listeners: EngineListener[] = []
  private imageCache: Map<string, HTMLImageElement> = new Map()

  // Selection highlight
  selectedStrokeIds: string[] = []
  selectedShapeIds: string[] = []

  constructor(base: HTMLCanvasElement, live: HTMLCanvasElement) {
    this.baseCanvas = base
    this.liveCanvas = live
    this.dpr = window.devicePixelRatio || 1
    this.baseCtx = base.getContext('2d')!
    this.liveCtx = live.getContext('2d')!
    this.contentCanvas = document.createElement('canvas')
    this.contentCtx = this.contentCanvas.getContext('2d')!
    this.startLiveLoop()
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  resize(cssW: number, cssH: number) {
    const dpr = window.devicePixelRatio || 1
    this.dpr = dpr
    for (const c of [this.baseCanvas, this.liveCanvas]) {
      c.width = cssW * dpr
      c.height = cssH * dpr
      c.style.width = `${cssW}px`
      c.style.height = `${cssH}px`
    }
    this.contentCanvas.width = cssW * dpr
    this.contentCanvas.height = cssH * dpr
    this.markBaseDirty()
  }

  setPan(x: number, y: number) {
    this.pan = { x, y }
    this.markBaseDirty()
    this.emit('viewport')
  }

  setZoom(z: number) {
    this.zoom = Math.max(0.05, Math.min(10, z))
    this.markBaseDirty()
    this.emit('viewport')
  }

  /** Zoom centered on a screen point */
  zoomAt(factor: number, screenX: number, screenY: number) {
    const newZoom = Math.max(0.05, Math.min(10, this.zoom * factor))
    const worldX = screenX / this.zoom + this.pan.x
    const worldY = screenY / this.zoom + this.pan.y
    this.pan = {
      x: worldX - screenX / newZoom,
      y: worldY - screenY / newZoom,
    }
    this.zoom = newZoom
    this.markBaseDirty()
    this.emit('viewport')
  }

  resetView() {
    this.pan = { x: 0, y: 0 }
    this.zoom = 1
    this.markBaseDirty()
    this.emit('viewport')
  }

  fitToContent() {
    const cssW = this.baseCanvas.width / this.dpr
    const cssH = this.baseCanvas.height / this.dpr
    const allPts = this.strokes.flatMap(s => s.points)
    if (!allPts.length) { this.resetView(); return }
    const xs = allPts.map(p => p.x), ys = allPts.map(p => p.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const pad = 60
    const w = maxX - minX + pad * 2, h = maxY - minY + pad * 2
    const zoom = Math.min(cssW / w, cssH / h, 2)
    this.pan = { x: minX - pad - (cssW / zoom - w) / 2, y: minY - pad - (cssH / zoom - h) / 2 }
    this.zoom = zoom
    this.markBaseDirty()
    this.emit('viewport')
  }

  markBaseDirty() { this.baseDirty = true }

  setData(strokes: Stroke[], shapes: Shape[], bg: Background) {
    this.strokes = strokes
    this.shapes = shapes
    this.background = bg
    this.markBaseDirty()
  }

  setSelection(strokeIds: string[], shapeIds: string[]) {
    this.selectedStrokeIds = strokeIds
    this.selectedShapeIds = shapeIds
    this.markBaseDirty()
  }

  startLiveStroke(stroke: LiveStroke) { this.liveStroke = stroke }
  updateLiveStroke(pts: Point[]) { if (this.liveStroke) this.liveStroke.points = pts }
  endLiveStroke() { this.liveStroke = null }

  startLiveShape(s: { type: string; x: number; y: number; x2: number; y2: number; color: string; strokeWidth: number }) { this.liveShape = s }
  updateLiveShape(x2: number, y2: number) { if (this.liveShape) { this.liveShape.x2 = x2; this.liveShape.y2 = y2 } }
  endLiveShape() { this.liveShape = null }

  setRemoteCursors(cursors: RemoteCursorRender[]) { this.remoteCursors = cursors }

  getViewport(): Viewport { return { pan: { ...this.pan }, zoom: this.zoom } }

  screenToWorld(sx: number, sy: number): Point {
    return { x: sx / this.zoom + this.pan.x, y: sy / this.zoom + this.pan.y }
  }
  worldToScreen(wx: number, wy: number): Point {
    return { x: (wx - this.pan.x) * this.zoom, y: (wy - this.pan.y) * this.zoom }
  }

  on(fn: EngineListener) { this.listeners.push(fn) }
  off(fn: EngineListener) { this.listeners = this.listeners.filter(l => l !== fn) }
  private emit(e: 'viewport' | 'dirty') { this.listeners.forEach(l => l(e)) }

  destroy() {
    if (this.liveRafId) cancelAnimationFrame(this.liveRafId)
    this.liveRafId = null
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  private startLiveLoop() {
    const loop = () => {
      this.liveRafId = requestAnimationFrame(loop)
      if (this.baseDirty) this.drawBase()
      // Salta drawLive se nulla è in movimento: risparmia CPU in idle
      if (this.liveStroke || this.liveShape || this.remoteCursors.length > 0 || this.baseDirty) {
        this.drawLive()
      }
    }
    this.liveRafId = requestAnimationFrame(loop)
  }

  private drawBase() {
    this.baseDirty = false
    const ctx = this.baseCtx
    const dpr = this.dpr
    const cssW = this.baseCanvas.width / dpr
    const cssH = this.baseCanvas.height / dpr

    // 1. Draw background on baseCtx
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)
    drawBackground(ctx, this.background, this.pan, this.zoom, cssW, cssH)

    // 2. Draw all strokes and shapes on offscreen contentCanvas
    const cc = this.contentCtx
    cc.setTransform(dpr, 0, 0, dpr, 0, 0)
    cc.clearRect(0, 0, cssW, cssH)

    applyTransform(cc, this.pan, this.zoom, dpr)

    // Shapes (immagini, rettangoli, ecc.) prima — i tratti ci vanno sempre sopra
    for (const s of this.shapes) {
      drawShape(cc, s, this.imageCache, () => this.markBaseDirty())
    }
    for (const s of this.strokes) {
      drawSingleStroke(cc, s, this.background)
    }

    // 3. Composite contentCanvas onto baseCtx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(this.contentCanvas, 0, 0)

    // 4. Selection highlight on baseCtx (in world coords)
    if (this.selectedStrokeIds.length || this.selectedShapeIds.length) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      applyTransform(ctx, this.pan, this.zoom, dpr)
      ctx.save()
      ctx.strokeStyle = '#0078d4'
      ctx.lineWidth = 1.5 / this.zoom
      ctx.setLineDash([4 / this.zoom, 3 / this.zoom])
      ctx.globalAlpha = 0.8

      for (const id of this.selectedStrokeIds) {
        const s = this.strokes.find(x => x.id === id)
        if (!s?.bbox) continue
        const { minX, minY, maxX, maxY } = s.bbox
        const pad = (s.width / 2 + 4) / this.zoom
        ctx.strokeRect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2)
      }
      for (const id of this.selectedShapeIds) {
        const s = this.shapes.find(x => x.id === id)
        if (!s) continue
        const bb = shapeBBox(s)
        const pad = 4 / this.zoom
        ctx.strokeRect(bb.minX - pad, bb.minY - pad, bb.maxX - bb.minX + pad * 2, bb.maxY - bb.minY + pad * 2)
      }
      ctx.restore()
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  private drawLive() {
    const ctx = this.liveCtx
    const dpr = this.dpr
    const cssW = this.liveCanvas.width / dpr
    const cssH = this.liveCanvas.height / dpr

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    if (!this.liveStroke && !this.liveShape && !this.remoteCursors.length) return

    applyTransform(ctx, this.pan, this.zoom, dpr)

    // Live stroke (current user drawing)
    if (this.liveStroke) {
      const ls = this.liveStroke
      ctx.save()
      if (ls.tool === 'eraser') {
        // Draw eraser cursor circle instead of destination-out on live layer
        const lastPt = ls.points[ls.points.length - 1]
        if (lastPt) {
          ctx.setLineDash([3 / this.zoom, 3 / this.zoom])
          ctx.strokeStyle = '#666'
          ctx.lineWidth = 1.5 / this.zoom
          ctx.globalAlpha = 0.7
          ctx.globalCompositeOperation = 'source-over'
          ctx.beginPath()
          ctx.arc(lastPt.x, lastPt.y, ls.width / 2, 0, Math.PI * 2)
          ctx.stroke()
        }
      } else if (ls.tool === 'laser') {
        const lastPt = ls.points[ls.points.length - 1]
        if (lastPt) {
          ctx.globalCompositeOperation = 'source-over'
          // Inner solid dot
          ctx.globalAlpha = 0.95
          ctx.fillStyle = '#ef4444'
          ctx.beginPath()
          ctx.arc(lastPt.x, lastPt.y, 7 / this.zoom, 0, Math.PI * 2)
          ctx.fill()
          // Outer faint ring
          ctx.globalAlpha = 0.35
          ctx.strokeStyle = '#ef4444'
          ctx.lineWidth = 1.5 / this.zoom
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.arc(lastPt.x, lastPt.y, 13 / this.zoom, 0, Math.PI * 2)
          ctx.stroke()
        }
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = ls.opacity ?? 1
        ctx.strokeStyle = ls.color
        ctx.fillStyle = ls.color
        drawStrokePath(ctx, ls.points, ls.width)
      }
      ctx.restore()
    }

    // Live shape preview (rubber-band)
    if (this.liveShape) {
      const ls = this.liveShape
      const isLine = ls.type === 'line' || ls.type === 'arrow'
      const tempShape = {
        id: 'live', type: ls.type,
        x: isLine ? ls.x : Math.min(ls.x, ls.x2),
        y: isLine ? ls.y : Math.min(ls.y, ls.y2),
        x2: isLine ? ls.x2 : undefined,
        y2: isLine ? ls.y2 : undefined,
        width: isLine ? undefined : Math.abs(ls.x2 - ls.x),
        height: isLine ? undefined : Math.abs(ls.y2 - ls.y),
        color: ls.color,
        strokeWidth: ls.strokeWidth,
        fillColor: 'transparent',
        rotation: 0,
      }
      ctx.save()
      ctx.globalAlpha = 0.75
      drawShape(ctx, tempShape as any)
      ctx.restore()
    }

    // Remote cursors (small colored dot + label)
    for (const cur of this.remoteCursors) {
      const isAdmin = cur.role === 'admin' || cur.role === 'operatore'
      const fill = isAdmin ? '#ef4444' : '#16a34a'
      const r = 5 / this.zoom
      ctx.save()
      ctx.beginPath()
      ctx.arc(cur.x, cur.y, r, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.globalAlpha = 0.85
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5 / this.zoom
      ctx.stroke()
      // label
      ctx.globalAlpha = 0.9
      ctx.font = `${11 / this.zoom}px Inter, sans-serif`
      ctx.fillStyle = fill
      ctx.textBaseline = 'bottom'
      ctx.fillText(isAdmin ? 'Prof' : 'Stud', cur.x + 7 / this.zoom, cur.y - 2 / this.zoom)
      ctx.restore()
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }
}
