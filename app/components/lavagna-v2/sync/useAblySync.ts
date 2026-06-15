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
  cursorLabel?: string
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

export function useAblySync({ channelName, engineRef, userId, role, cursorLabel, lavagnaId, attivitaId, isAdmin, onPermissionsUpdate, onDrawRequest }: Options) {
  const store = useWhiteboardStore()
  const channelRef = useRef<any>(null)
  const remoteStreams = useRef<Map<string, RemoteStream>>(new Map())
  const cursorTs = useRef<Record<string, number>>({})
  const pendingMessages = useRef<Array<{ name: string; data: any }>>([])
  // Track IDs of strokes deleted locally so that late/replayed stroke:done don't re-add them
  const deletedStrokeIds = useRef<Set<string>>(new Set())

  // ── publish helper ──────────────────────────────────────────────────────────

  const publish = useCallback((name: string, data: any) => {
    const ch = channelRef.current
    if (ch) {
      try { ch.publish(name, { ...data, senderId: userId }) } catch (_) {}
    } else {
      const q = pendingMessages.current
      if (q.length < 100) q.push({ name, data: { ...data, senderId: userId } })
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
        if (event.stroke) {
          deletedStrokeIds.current.add(String(event.stroke.id))
          publish('stroke:delete', { strokeId: event.stroke.id, lavagnaId })
        }
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
        publish('cursor:move', { x: event.x, y: event.y, role, label: cursorLabel, lavagnaId })
        break
    }
  }, [publish, lavagnaId, attivitaId, role, cursorLabel])

  const emitPermissionsUpdate = useCallback((data: { canStudentDraw: boolean }) => {
    publish('permissions:update', { ...data, lavagnaId })
  }, [publish, lavagnaId])

  const emitDrawRequest = useCallback(() => {
    publish('draw:request', { lavagnaId })
  }, [publish, lavagnaId])

  const emitForceSyncViewport = useCallback(() => {
    const eng = engineRef.current
    if (!eng) return
    const dpr = eng['dpr'] || 1
    const cssW = (eng['baseCanvas']?.width || 800) / dpr
    const cssH = (eng['baseCanvas']?.height || 600) / dpr
    // Send viewport center in world coordinates so students with different screen sizes
    // can recompute their own pan and show the same content centered.
    publish('viewport:force-sync', {
      center: {
        x: eng.pan.x + (cssW / 2) / eng.zoom,
        y: eng.pan.y + (cssH / 2) / eng.zoom,
      },
      zoom: eng.zoom,
      lavagnaId,
    })
  }, [publish, lavagnaId])

  // ── channel setup ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!channelName || !userId) return
    let ch: any = null
    let alive = true

    // Single interval to expire all stale cursors (replaces per-cursor setTimeout)
    const cursorExpiryInterval = setInterval(() => {
      const now = Date.now()
      for (const [uid, ts] of Object.entries(cursorTs.current)) {
        if (now - ts > 3000) {
          store.expireRemoteCursor(uid)
          delete cursorTs.current[uid]
        }
      }
    }, 1000)

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
          // Skip strokes that were deleted locally (race: stroke:done arrives after local erase)
          if (d.streamId && deletedStrokeIds.current.has(String(d.streamId))) return
          const stream = remoteStreams.current.get(d.streamId)
          remoteStreams.current.delete(d.streamId)
          engineRef.current?.endLiveStroke()
          // Prefer fallback (canonical simplified points sent with stroke:done) over accumulated stream.
          // For Shift straight-line strokes no stroke:points are emitted during drag, so the
          // accumulated stream only has the single start point from stroke:start — using it would
          // produce a degenerate stroke.  The fallback is always the authoritative final path.
          const src = d.fallback
            ? { id: d.streamId, ...d.fallback }
            : (stream && stream.points.length >= 1 ? stream : null)
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
          const uid = String(d.senderId)
          store.setRemoteCursor({ userId: d.senderId, role: d.role || 'unknown', label: d.label, x: d.x, y: d.y, ts: Date.now() })
          cursorTs.current[uid] = Date.now()
        }

        const onForceSyncViewport = (msg: any) => {
          if (isAdmin) return
          const d = msg.data || {}
          const eng = engineRef.current
          if (!eng) return
          const zoom = d.zoom || eng.zoom
          if (d.zoom) eng.setZoom(zoom)
          if (d.center) {
            // Compute pan so this screen's center aligns with the admin's world-space center
            const dpr = eng['dpr'] || 1
            const cssW = (eng['baseCanvas']?.width || 800) / dpr
            const cssH = (eng['baseCanvas']?.height || 600) / dpr
            eng.setPan(d.center.x - (cssW / 2) / zoom, d.center.y - (cssH / 2) / zoom)
          } else if (d.pan) {
            // Legacy fallback
            eng.setPan(d.pan.x, d.pan.y)
          }
        }

        const onClear = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          // Require lavagnaId to match — absent lavagnaId (old stale messages) is also rejected
          if (String(d.lavagnaId) !== String(lavagnaId)) return
          // Reject replayed history: clear must be < 10 seconds old
          if (!d.ts || Date.now() - d.ts > 10_000) return
          store.clearAll()
        }

        const onStrokeDelete = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          if (d.strokeId) {
            deletedStrokeIds.current.add(String(d.strokeId))
            store.deleteStroke(d.strokeId)
          }
        }

        const onShapeAdd = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          if (d.shape) store.addShape(d.shape)
        }

        const onShapeDelete = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          // Use getState() for fresh shape list (store in closure may be stale)
          const { shapes, deleteShape } = useWhiteboardStore.getState()
          if (d.shapeDbId) {
            const byDbId = shapes.find(
              (x: any) => x.dbId && (x.dbId === d.shapeDbId || String(x.dbId) === String(d.shapeDbId))
            )
            if (byDbId) { deleteShape(byDbId.id); return }
          }
          if (d.shapeId) deleteShape(d.shapeId)
        }

        const onShapeUpdate = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          if (!d.patch) return
          // Use getState() for fresh shape list (store in closure may be stale)
          const { shapes, updateShape } = useWhiteboardStore.getState()
          let target = d.shapeId ? shapes.find((s: any) => s.id === d.shapeId) : null
          if (!target && d.shapeDbId) {
            target = shapes.find((s: any) =>
              Number(s.dbId) === Number(d.shapeDbId) || s.id === `shape-${d.shapeDbId}`
            )
          }
          if (target) updateShape(target.id, d.patch)
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

        const onBackgroundUpdate = (msg: any) => {
          const d = msg.data || {}
          if (d.senderId === userId) return
          if (d.background) store.setBackground(d.background)
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
        ch.subscribe('background:update', onBackgroundUpdate)

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
      clearInterval(cursorExpiryInterval)
      channelRef.current = null
      if (ch) {
        try { ch.unsubscribe() } catch (_) {}
      }
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

  const emitBackground = useCallback((background: string) => {
    publish('background:update', { background, lavagnaId })
  }, [publish, lavagnaId])

  const emitClear = useCallback(() => {
    publish('clear', { lavagnaId, ts: Date.now() })
  }, [publish, lavagnaId])

  return { emitStrokeEvent, emitForceSyncViewport, emitPermissionsUpdate, emitDrawRequest, emitShapeUpdate, emitBackground, emitClear, publish }
}
