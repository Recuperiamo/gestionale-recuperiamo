// @ts-nocheck
/**
 * useTextTool — manages the text editing overlay.
 * When the user clicks on the canvas with tool='text',
 * an absolutely-positioned <textarea> appears at that world position.
 * On blur/Enter the text is committed as a Shape.
 */
import { useState, useCallback, useRef } from 'react'
import { CanvasEngine } from '../engine/CanvasEngine'
import { useWhiteboardStore } from '../store/whiteboardStore'
import { generateId } from '../engine/strokeUtils'

interface TextSession {
  screenX: number
  screenY: number
  worldX: number
  worldY: number
}

export function useTextTool(engineRef: React.RefObject<CanvasEngine>, onShapeCommit?: (shape: any) => void) {
  const [session, setSession] = useState<TextSession | null>(null)
  const [value, setValue] = useState('')
  const store = useWhiteboardStore()

  const startText = useCallback((canvasScreenX: number, canvasScreenY: number) => {
    const eng = engineRef.current
    if (!eng) return
    const world = eng.screenToWorld(canvasScreenX, canvasScreenY)
    setSession({ screenX: canvasScreenX, screenY: canvasScreenY, worldX: world.x, worldY: world.y })
    setValue('')
  }, [engineRef])

  const commit = useCallback(() => {
    if (!session || !value.trim()) { cancel(); return }
    const { color, strokeWidth } = store
    const shape = {
      id: generateId(),
      type: 'text' as const,
      x: session.worldX,
      y: session.worldY,
      color,
      strokeWidth,
      fillColor: 'transparent',
      text: value.trim(),
      fontSize: Math.max(14, strokeWidth * 5),
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
    }
    store.addShape(shape)
    store.pushUndo({ type: 'add-shape', shape })
    onShapeCommit?.(shape)
    setSession(null)
    setValue('')
  }, [session, value, store, onShapeCommit])

  const cancel = useCallback(() => {
    setSession(null)
    setValue('')
  }, [])

  return { session, value, setValue, startText, commit, cancel }
}
