// @ts-nocheck
/**
 * usePersistence — saves/loads strokes and shapes to/from the existing API.
 * Reuses the same /api/lavagna/tratto and /api/lavagna/shape endpoints.
 */
import { useCallback } from 'react'
import { useWhiteboardStore } from '../store/whiteboardStore'
import { Stroke } from '../engine/strokeUtils'

interface Options {
  lavagnaId: string
  userId: string | number
}

export function usePersistence({ lavagnaId, userId }: Options) {
  const store = useWhiteboardStore()

  const saveStroke = useCallback(async (stroke: Stroke): Promise<string | number | null> => {
    if (!lavagnaId || !userId) return null
    store.setSaving(true)
    try {
      const body = {
        id: stroke.id,
        lavagnaId,
        strumento: stroke.tool,
        colore: stroke.tool === 'eraser' ? null : stroke.color,
        spessore: stroke.width,
        punti: stroke.points,
      }
      // Use upsert endpoint — POST with streamId handles both create and update
      const res = await fetch('/api/lavagna/tratto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { console.error('[PERSIST] save stroke error', json.error); return null }
      // Update stroke in store with DB id
      const dbId = json.tratto?.id
      if (dbId) store.updateStroke(stroke.id, { dbId })
      return dbId ?? null
    } catch (e) {
      console.error('[PERSIST] save stroke exception', e)
      return null
    } finally {
      store.setSaving(false)
    }
  }, [lavagnaId, userId, store])

  const deleteStroke = useCallback(async (dbId: string | number) => {
    if (!dbId) return
    try {
      await fetch(`/api/lavagna/tratto/${dbId}`, { method: 'DELETE' })
    } catch (_) {}
  }, [])

  const clearBoard = useCallback(async () => {
    if (!lavagnaId) return
    try {
      await fetch(`/api/lavagna/clear?lavagnaId=${lavagnaId}`, { method: 'DELETE' })
      store.clearAll()
    } catch (_) {}
  }, [lavagnaId, store])

  return { saveStroke, deleteStroke, clearBoard }
}
