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
import { getAblyChannel } from '../../../lib/realtime/ablyClient'
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

export function useAblySync({ channelName, engineRef, userId, role, lavagnaId, attivitaId, isAdmin }: Options) {
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
        publish('stroke:done', { streamId: event.stroke.id, lavagnaId })
        break
      case 'cursor':
        publish('cursor:move', { x: event.x, y: event.y, role, lavagnaId })
        break
    }
  }, [publish, lavagnaId, attivitaId, role])

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
        ch = getAblyChannel(channelName)
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
          if (!stream || stream.points.length < 1) return
          const stroke = prepareStroke({
            id: stream.id,
            tool: stream.tool,
            color: stream.color,
            width: stream.width,
            opacity: stream.opacity,
            points: stream.points,
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

        ch.subscribe('stroke:start', onStrokeStart)
        ch.subscribe('stroke:points', onStrokePoints)
        ch.subscribe('stroke:done', onStrokeDone)
        ch.subscribe('stroke:cancel', onStrokeCancel)
        ch.subscribe('cursor:move', onCursorMove)
        ch.subscribe('viewport:force-sync', onForceSyncViewport)
        ch.subscribe('clear', onClear)

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

  return { emitStrokeEvent, emitForceSyncViewport, publish }
}
