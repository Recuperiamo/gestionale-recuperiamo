// @ts-nocheck
/**
 * useAblySync — real-time collaboration via Ably.
 *
 * Handles:
 *  - stroke:start / stroke:points / stroke:done / stroke:cancel
 *  - cursor:move
 *  - viewport:force-sync (admin → student)
 *  - clear
 *
 * Remote strokes are rendered live via engine.startLiveStroke / updateLiveStroke / endLiveStroke
 * then committed to the store when stroke:done arrives.
 */
import { useEffect, useRef, useCallback } from 'react'
import { getAblyChannelAsync } from '../../../lib/realtime/ablyClient'
import { useWhiteboardStore } from '../store/whiteboardStore'
import { CanvasEngine } from '../engine/CanvasEngine'
import { prepareStroke } from '../engine/strokeUtils'

interface Options {
  channelName: string
  engineRef: React.RefObject<CanvasEngine>
  userId: string | number
  role: string
  lavagnaId: string
  attivitaId?: string
  isAdmin: boolean
  onPermissionsUpdate?: (data: { canStudentDraw: boolean }) => void
  onDrawRequest?: () => void
}

// Remote streams accumulate points until stroke:done
type RemoteStream = {
  id: string
  tool: string
  color: string
  width: number
  opacity: number
  points: any[]
}

export function useAblySync({ channelName, engineRef, userId, role, lavagnaId, attivitaId, isAdmin, onPermissionsUpdate, onDrawRequest }: Options) {
  const store = useWhiteboardStore()
  const channelRef = useRef<any>(null)
  const remoteStreams = useRef<Map<string, RemoteStream>>(new Map())
  const cursorTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const pendingMessages = useRef<Array<{ name: string; data: any }>>([])

  // ── publish helper ──────────────────────────────────────────────────────────

  const publish = useCallback((name: string, data: any) => {
    const ch = channelRef.current
    if (ch) {
      try { ch.publish(name, { ...data, senderId: userId }) } catch (_) {}
    } else {
      pendingMessages.current.push({ name, data: { ...data, senderId: userId } })
    }
  }, [userId])

  // ── stroke event emitters (called by usePointerHandlers) ────────────────────

  const emitStrokeEvent = useCallback((event: any) => {
    if (!event) return
    switch (event.type) {
      case 'start':
        publish('stroke:start', {
          streamId: event.streamId, tool: event.tool, color: event.color,
          width: event.strokeWidth, opacity: event.opacity,
          start: event.start, lavagnaId, attivitaId,
        })
        break
      case 'points':
        publish('stroke:points', { streamId: event.streamId, points: event.points, lavagnaId })
        break
      case 'commit':
        // Include full stroke data as fallback in case stroke:start was missed
        publish('stroke:done', {
          streamId: event.stroke.id,
          lavagnaId,
          fallback: {
            tool: event.stroke.tool,
            color: event.stroke.color,
            width: event.stroke.width,
            opacity: event.stroke.opacity,
            points: event.stroke.points,
          },
        })
        break
      case 'delete-stroke':
        if (event.stroke) publish('stroke:delete', { strokeId: event.stroke.id, lavagnaId })
        break
      case 'commit-shape':
        if (event.shape) publish('shape:add', { shape: event.shape, lavagnaId })
        break
      case 'delete-shape':
        if (event.shape) publish('shape:delete', {
          shapeId: event.shape.id,
          shapeDbId: event.shape.dbId ?? null,  // necessario per studenti che hanno caricato la shape da DB
          lavagnaId,
        })
        break
      case 'cursor':
        publish('cursor:move', { x: event.x, y: event.y, role, lavagnaId })
        break
    }
  }, [publish, lavagnaId, attivitaId, role])

  const emitPermissionsUpdate = useCallback((data: { canStudentDraw: boolean }) => {
    publish('permissions:update', { ...data, lavagnaId })
  }, [publish, lavagnaId])

  const emitDrawRequest = useCallback(() => {
    publish('draw:request', { lavagnaId })
  }, [publish, lavagnaId])

  const emitForceSyncViewport = useCallback(() => {
    const eng = engineRef.current
    if (!eng) return
    const cssW = eng['baseCanvas']?.width / eng['dpr'] || 800
    const cssH = eng['baseCanvas']?.height / eng['dpr'] || 600
    publish('viewport:force-sync', {
      pan: eng.pan,
      zoom: eng.zoom,
      visibleRect: { x: eng.pan.x, y: eng.pan.y, width: cssW / eng.zoom, height: cssH / eng.zoom },
      lavagnaId,
    })
  }, [publish, lavagnaId])

  // ── channel setup ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!channelName) return
    let ch: any = null
    let alive = true

    ;(async () => {
      try {
        ch = await getAblyChannelAsync(channelName)
        if (!alive) return
        channelRef.current = ch

        // ── Incoming handlers ──

        const onStrokeStart = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          const stream: RemoteStream = {
            id: d.streamId, tool: d.tool || 'pen', color: d.color || '#1a1a1a',
            width: d.width || 3, opacity: d.opacity ?? 1, points: d.start ? [d.start] : [],
          }
          remoteStreams.current.set(d.streamId, stream)
          engineRef.current?.startLiveStroke({ ...stream })
        }

        const onStrokePoints = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          const stream = remoteStreams.current.get(d.streamId)
          if (!stream || !Array.isArray(d.points)) return
          stream.points.push(...d.points)
          engineRef.current?.updateLiveStroke([...stream.points])
        }

        const onStrokeDone = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          const stream = remoteStreams.current.get(d.streamId)
          remoteStreams.current.delete(d.streamId)
          engineRef.current?.endLiveStroke()
          // Use accumulated stream if available; otherwise use fallback data sent with stroke:done
          const src = (stream && stream.points.length >= 1) ? stream : (d.fallback ? { id: d.streamId, ...d.fallback } : null)
          if (!src || !src.points?.length) return
          const stroke = prepareStroke({
            id: src.id ?? d.streamId,
            tool: src.tool || 'pen',
            color: src.color || '#1a1a1a',
            width: src.width || 3,
            opacity: src.opacity ?? 1,
            points: src.points,
          })
          store.addStroke(stroke)
        }

        const onStrokeCancel = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          remoteStreams.current.delete(d.streamId)
          engineRef.current?.endLiveStroke()
        }

        const onCursorMove = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          store.setRemoteCursor({ userId: d.senderId, role: d.role || 'unknown', x: d.x, y: d.y, ts: Date.now() })
          const uid = String(d.senderId)
          clearTimeout(cursorTimeouts.current[uid])
          cursorTimeouts.current[uid] = setTimeout(() => store.expireRemoteCursor(uid), 3000)
        }

        const onForceSyncViewport = (msg: any) => {
          if (isAdmin) return
          const d = msg.data || {}
          const eng = engineRef.current
          if (!eng || !d.pan) return
          eng.setPan(d.pan.x, d.pan.y)
          if (d.zoom) eng.setZoom(d.zoom)
        }

        const onClear = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          store.clearAll()
        }

        const onStrokeDelete = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          if (d.strokeId) store.deleteStroke(d.strokeId)
        }

        const onShapeAdd = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          if (d.shape) store.addShape(d.shape)
        }

        const onShapeDelete = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          // Prova prima per dbId (shapes caricate da DB hanno id diverso da chi le ha create)
          if (d.shapeDbId) {
            const byDbId = store.shapes.find(
              x => x.dbId && (x.dbId === d.shapeDbId || String(x.dbId) === String(d.shapeDbId))
            )
            if (byDbId) { store.deleteShape(byDbId.id); return }
          }
          // Fallback: id locale (shapes ricevute via Ably shape:add hanno lo stesso id)
          if (d.shapeId) store.deleteShape(d.shapeId)
        }

        const onShapeUpdate = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          if (!d.patch) return
          // Cerca per id locale (shape aggiunta via Ably shape:add)
          let target = d.shapeId ? store.shapes.find((s: any) => s.id === d.shapeId) : null
          // Fallback: cerca per dbId (shape caricata da DB ha id diverso dal prof)
          if (!target && d.shapeDbId) {
            target = store.shapes.find((s: any) =>
              Number(s.dbId) === Number(d.shapeDbId) || s.id === `shape-${d.shapeDbId}`
            )
          }
          if (target) store.updateShape(target.id, d.patch)
        }

        const onPermissionsUpdateMsg = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          if (!isAdmin && typeof d.canStudentDraw === 'boolean') {
            onPermissionsUpdate?.({ canStudentDraw: d.canStudentDraw })
          }
        }

        const onDrawRequestMsg = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          if (isAdmin) onDrawRequest?.()
        }

        ch.subscribe('stroke:start', onStrokeStart)
        ch.subscribe('stroke:points', onStrokePoints)
        ch.subscribe('stroke:done', onStrokeDone)
        ch.subscribe('stroke:cancel', onStrokeCancel)
        ch.subscribe('cursor:move', onCursorMove)
        ch.subscribe('viewport:force-sync', onForceSyncViewport)
        ch.subscribe('clear', onClear)
        ch.subscribe('stroke:delete', onStrokeDelete)
        ch.subscribe('shape:add', onShapeAdd)
        ch.subscribe('shape:delete', onShapeDelete)
        ch.subscribe('shape:update', onShapeUpdate)
        ch.subscribe('permissions:update', onPermissionsUpdateMsg)
        ch.subscribe('draw:request', onDrawRequestMsg)

        // Flush pending messages
        for (const m of pendingMessages.current) {
          try { ch.publish(m.name, m.data) } catch (_) {}
        }
        pendingMessages.current = []

      } catch (err) {
        console.error('[ABLY-V2] setup error', err)
      }
    })()

    return () => {
      alive = false
      channelRef.current = null
      if (ch) {
        try { ch.unsubscribe() } catch (_) {}
      }
      Object.values(cursorTimeouts.current).forEach(t => clearTimeout(t))
    }
  }, [channelName, userId, isAdmin])

  const emitShapeUpdate = useCallback((shape: any) => {
    publish('shape:update', {
      shapeId: shape.id,
      shapeDbId: shape.dbId ?? null,  // per studenti con id locale diverso (caricato da DB)
      patch: {
        x: shape.x, y: shape.y, width: shape.width, height: shape.height,
        x2: shape.x2, y2: shape.y2, rotation: shape.rotation,
        ...(shape.dbId ? { dbId: shape.dbId } : {}),  // propaga dbId agli studenti
      },
      lavagnaId,
    })
  }, [publish, lavagnaId])

  return { emitStrokeEvent, emitForceSyncViewport, emitPermissionsUpdate, emitDrawRequest, emitShapeUpdate, publish }
}
