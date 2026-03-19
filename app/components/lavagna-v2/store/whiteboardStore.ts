// @ts-nocheck
/**
 * whiteboardStore.ts — Zustand store for whiteboard state.
 *
 * Viewport (pan/zoom) lives in plain refs inside CanvasEngine — NOT here —
 * to avoid React re-renders on every pointer move. Only tool state,
 * strokes, shapes and UI flags live here.
 */
import { create } from 'zustand'
import { Stroke, Shape, prepareStroke, strokeBBox } from '../engine/strokeUtils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Tool = 'pen' | 'highlighter' | 'eraser' | 'hand' | 'select' | 'laser'
  | 'rect' | 'ellipse' | 'line' | 'arrow' | 'diamond' | 'triangle' | 'text'

export type Background = 'white' | 'black' | 'grid' | 'lines' | 'dots'

export interface RemoteCursor {
  userId: string | number
  role: string
  x: number
  y: number
  ts: number
}

export interface UndoEntry {
  type: 'add-stroke' | 'delete-stroke' | 'add-shape' | 'delete-shape' | 'move-stroke' | 'move-shape'
  stroke?: Stroke
  shape?: Shape
  before?: any
  after?: any
}

interface WBState {
  // ── Tool state ──
  tool: Tool
  color: string
  strokeWidth: number
  opacity: number         // 1 for pen, 0.4 for highlighter
  eraserMode: 'stroke' | 'point'
  background: Background

  // ── Data ──
  strokes: Stroke[]
  shapes: Shape[]

  // ── Selection ──
  selectedStrokeIds: string[]
  selectedShapeIds: string[]

  // ── Undo / Redo ──
  undoStack: UndoEntry[]
  redoStack: UndoEntry[]

  // ── Remote collaborators ──
  remoteCursors: Record<string, RemoteCursor>

  // ── UI ──
  toolbarOpen: boolean
  saving: boolean

  // ── Actions ──
  setTool: (t: Tool) => void
  setColor: (c: string) => void
  setStrokeWidth: (w: number) => void
  setBackground: (b: Background) => void
  setEraserMode: (m: 'stroke' | 'point') => void

  addStroke: (s: Stroke, fromRemote?: boolean) => void
  updateStroke: (id: string, patch: Partial<Stroke>) => void
  deleteStroke: (id: string, fromRemote?: boolean) => void
  clearAll: () => void

  addShape: (s: Shape, fromRemote?: boolean) => void
  updateShape: (id: string, patch: Partial<Shape>) => void
  deleteShape: (id: string, fromRemote?: boolean) => void

  setSelection: (strokeIds: string[], shapeIds: string[]) => void
  clearSelection: () => void

  setRemoteCursor: (cursor: RemoteCursor) => void
  expireRemoteCursor: (userId: string) => void

  pushUndo: (entry: UndoEntry) => void
  undo: () => UndoEntry | null
  redo: () => UndoEntry | null

  loadInitial: (strokes: any[], shapes: any[]) => void
  setSaving: (v: boolean) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWhiteboardStore = create<WBState>((set, get) => ({
  tool: 'pen',
  color: '#1a1a1a',
  strokeWidth: 3,
  opacity: 1,
  eraserMode: 'stroke',
  background: 'white',

  strokes: [],
  shapes: [],

  selectedStrokeIds: [],
  selectedShapeIds: [],

  undoStack: [],
  redoStack: [],

  remoteCursors: {},
  toolbarOpen: true,
  saving: false,

  // ── Tool ──
  setTool: (tool) => {
    const opacity = tool === 'highlighter' ? 0.4 : 1
    set({ tool, opacity })
  },
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setBackground: (background) => set({ background }),
  setEraserMode: (eraserMode) => set({ eraserMode }),

  // ── Strokes ──
  addStroke: (s) => {
    const stroke = prepareStroke(s)
    set(st => ({
      strokes: [...st.strokes, stroke],
      redoStack: [], // new action clears redo
    }))
  },
  updateStroke: (id, patch) => set(st => ({
    strokes: st.strokes.map(s => {
      if (s.id !== id) return s
      const updated = { ...s, ...patch }
      if (patch.points) updated.bbox = strokeBBox(patch.points)
      return updated
    })
  })),
  deleteStroke: (id) => set(st => ({
    strokes: st.strokes.filter(s => s.id !== id),
    selectedStrokeIds: st.selectedStrokeIds.filter(i => i !== id),
  })),
  clearAll: () => set({ strokes: [], shapes: [], selectedStrokeIds: [], selectedShapeIds: [], undoStack: [], redoStack: [] }),

  // ── Shapes ──
  addShape: (s) => set(st => ({ shapes: [...st.shapes, s], redoStack: [] })),
  updateShape: (id, patch) => set(st => ({
    shapes: st.shapes.map(s => s.id === id ? { ...s, ...patch } : s)
  })),
  deleteShape: (id) => set(st => ({
    shapes: st.shapes.filter(s => s.id !== id),
    selectedShapeIds: st.selectedShapeIds.filter(i => i !== id),
  })),

  // ── Selection ──
  setSelection: (strokeIds, shapeIds) => set({ selectedStrokeIds: strokeIds, selectedShapeIds: shapeIds }),
  clearSelection: () => set({ selectedStrokeIds: [], selectedShapeIds: [] }),

  // ── Remote cursors ──
  setRemoteCursor: (cursor) => set(st => ({
    remoteCursors: { ...st.remoteCursors, [cursor.userId]: cursor }
  })),
  expireRemoteCursor: (userId) => set(st => {
    const c = { ...st.remoteCursors }
    delete c[userId]
    return { remoteCursors: c }
  }),

  // ── Undo / Redo ──
  pushUndo: (entry) => set(st => ({
    undoStack: [...st.undoStack.slice(-49), entry], // max 50
    redoStack: [],
  })),
  undo: () => {
    const { undoStack } = get()
    if (!undoStack.length) return null
    const entry = undoStack[undoStack.length - 1]
    set(st => ({
      undoStack: st.undoStack.slice(0, -1),
      redoStack: [entry, ...st.redoStack],
    }))
    return entry
  },
  redo: () => {
    const { redoStack } = get()
    if (!redoStack.length) return null
    const entry = redoStack[0]
    set(st => ({
      redoStack: st.redoStack.slice(1),
      undoStack: [...st.undoStack, entry],
    }))
    return entry
  },

  // ── Init ──
  loadInitial: (rawStrokes, rawShapes) => {
    const strokes = (rawStrokes || []).map(s => prepareStroke({
      ...s,
      id: s.streamId || String(s.id),
      dbId: s.id,
      tool: s.strumento || 'pen',
      color: s.colore || '#1a1a1a',
      width: s.spessore || 3,
      opacity: 1,
      points: s.punti || [],
    }))
    const shapes = (rawShapes || []).map(s => ({
      id: `shape-${s.id}`,
      dbId: s.id,
      type: s.kind || s.type || 'rect',
      x: s.x ?? 0,
      y: s.y ?? 0,
      width: s.w ?? s.width ?? 0,
      height: s.h ?? s.height ?? 0,
      x2: s.x2 ?? undefined,
      y2: s.y2 ?? undefined,
      color: s.colore || s.color || '#1a1a1a',
      strokeWidth: s.spessore || s.strokeWidth || 2,
      fillColor: s.fillColor || 'transparent',
      text: s.titolo || s.text || undefined,
      fontSize: s.fontSize ?? undefined,
      fontFamily: s.fontFamily ?? undefined,
      rotation: s.rotation ?? 0,
    }))
    set({ strokes, shapes })
  },
  setSaving: (saving) => set({ saving }),
}))
