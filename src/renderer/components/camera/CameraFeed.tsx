import { useEffect, useRef, useState } from 'react'
import { TemperatureOverlay } from './TemperatureOverlay'
import { TemperatureColorBar } from './TemperatureColorBar'
import { CameraControlPanel } from './CameraControlPanel'
import { useMachineStore } from '../../stores/machineStore'

interface CameraFeedProps {
  title: string
  streamUrl: string | null
  mode: 'mjpeg' | 'websocket'
  cameraIndex?: number
}

export function CameraFeed({ title, streamUrl, mode = 'mjpeg', cameraIndex = 0 }: CameraFeedProps) {
  const [fullscreen, setFullscreen] = useState(false)

  const feed = mode === 'websocket'
    ? <WebSocketFeed title={title} wsUrl={streamUrl} cameraIndex={cameraIndex} onFullscreenToggle={() => setFullscreen(!fullscreen)} />
    : <MjpegFeed title={title} streamUrl={streamUrl} />

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        onKeyDown={(e) => { if (e.key === 'Escape') setFullscreen(false) }}
        tabIndex={0}
        ref={(el) => el?.focus()}
      >
        <button
          onClick={() => setFullscreen(false)}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 text-lg"
        >
          {'\u2715'}
        </button>
        <div className="w-full h-full">
          {feed}
        </div>
      </div>
    )
  }

  return feed
}

function MjpegFeed({ title, streamUrl }: { title: string; streamUrl: string | null }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden flex flex-col">
      <CameraHeader title={title} status={loaded && !error ? 'live' : error ? 'error' : 'connecting'} />
      <div className="relative flex-1 bg-black flex items-center justify-center min-h-[100px]">
        {streamUrl ? (
          <img
            src={streamUrl}
            alt={title}
            onLoad={() => { setLoaded(true); setError(false) }}
            onError={() => { setError(true); setLoaded(false) }}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-zinc-600 text-sm">Camera not started</div>
        )}
      </div>
    </div>
  )
}

export interface FrameMetadata {
  mean: number
  min: number
  max: number
  hotX: number
  hotY: number
  hotT: number
  coldX: number
  coldY: number
  coldT: number
  scaleMin: number
  scaleMax: number
  palette: string
  scaling: string
}

function parseFrame(buffer: ArrayBuffer): { metadata: FrameMetadata | null; jpegBlob: Blob } {
  const view = new DataView(buffer)
  // Detect old format: pure JPEG starts with 0xFF 0xD8
  if (buffer.byteLength >= 2 && view.getUint8(0) === 0xFF && view.getUint8(1) === 0xD8) {
    return { metadata: null, jpegBlob: new Blob([buffer], { type: 'image/jpeg' }) }
  }
  // New format: [4-byte LE uint32 jsonLen][JSON][JPEG]
  if (buffer.byteLength < 4) {
    return { metadata: null, jpegBlob: new Blob([buffer], { type: 'image/jpeg' }) }
  }
  const jsonLen = view.getUint32(0, true)
  if (jsonLen === 0 || 4 + jsonLen > buffer.byteLength) {
    return { metadata: null, jpegBlob: new Blob([buffer], { type: 'image/jpeg' }) }
  }
  try {
    const jsonBytes = new Uint8Array(buffer, 4, jsonLen)
    const metadata = JSON.parse(new TextDecoder().decode(jsonBytes)) as FrameMetadata
    const jpegBytes = new Uint8Array(buffer, 4 + jsonLen)
    return { metadata, jpegBlob: new Blob([jpegBytes], { type: 'image/jpeg' }) }
  } catch {
    return { metadata: null, jpegBlob: new Blob([buffer], { type: 'image/jpeg' }) }
  }
}

function WebSocketFeed({ title, wsUrl, cameraIndex, onFullscreenToggle }: { title: string; wsUrl: string | null; cameraIndex: number; onFullscreenToggle?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const [status, setStatus] = useState<'connecting' | 'live' | 'error' | 'offline'>('offline')
  const [fps, setFps] = useState(0)
  const [metadata, setMetadata] = useState<FrameMetadata | null>(null)
  const lastDrawnSeq = useRef(0)
  const canvasDims = useRef({ w: 0, h: 0 })
  const settings = useMachineStore((s) => s.cameraSettings[cameraIndex])

  useEffect(() => {
    if (!wsUrl) {
      setStatus('offline')
      return
    }

    setStatus('connecting')
    let frameSeq = 0
    let frameCount = 0
    let lastFpsTime = Date.now()
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let activeWs: WebSocket | null = null
    let disposed = false
    lastDrawnSeq.current = 0

    function connect() {
      if (disposed) return
      const ws = new WebSocket(wsUrl!)
      ws.binaryType = 'arraybuffer'
      activeWs = ws

      ws.onopen = () => {
        setStatus('live')
      }

      ws.onclose = () => {
        if (disposed) return
        setStatus('connecting')
        reconnectTimer = setTimeout(connect, 2000)
      }

      ws.onerror = () => {
        setStatus('error')
      }

      ws.onmessage = (event) => {
        frameCount++
        const now = Date.now()
        if (now - lastFpsTime >= 1000) {
          setFps(frameCount)
          frameCount = 0
          lastFpsTime = now
        }

        const canvas = canvasRef.current
        if (!canvas) return

        // Cache 2D context
        if (!ctxRef.current) {
          ctxRef.current = canvas.getContext('2d')
        }
        const ctx = ctxRef.current
        if (!ctx) return

        // Parse frame (metadata + JPEG or pure JPEG)
        const { metadata: meta, jpegBlob } = parseFrame(event.data as ArrayBuffer)
        if (meta) {
          setMetadata(meta)
        }

        // Track frame ordering
        const seq = ++frameSeq
        const img = new window.Image()
        const url = URL.createObjectURL(jpegBlob)
        img.onload = () => {
          // Skip stale frames
          if (seq < lastDrawnSeq.current) {
            URL.revokeObjectURL(url)
            return
          }
          lastDrawnSeq.current = seq

          // Only resize canvas when dimensions change (avoids flash)
          if (canvasDims.current.w !== img.width || canvasDims.current.h !== img.height) {
            canvas.width = img.width
            canvas.height = img.height
            canvasDims.current = { w: img.width, h: img.height }
          }
          ctx.drawImage(img, 0, 0)
          URL.revokeObjectURL(url)
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
        }
        img.src = url
      }
    }

    connect()

    return () => {
      disposed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      activeWs?.close()
      ctxRef.current = null
    }
  }, [wsUrl])

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden flex flex-col">
      <CameraHeader title={title} status={status} fps={fps} metadata={metadata} onFullscreen={onFullscreenToggle} />
      <div className="relative flex-1 flex">
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[100px]">
          {wsUrl ? (
            <canvas ref={canvasRef} className="w-full" style={{ imageRendering: 'auto' }} />
          ) : (
            <div className="text-zinc-600 text-sm">Camera not started</div>
          )}
          {wsUrl && status === 'connecting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <span className="text-zinc-400 text-sm">Connecting to camera...</span>
            </div>
          )}
          {settings?.showOverlay && metadata && (
            <TemperatureOverlay
              metadata={metadata}
              imgWidth={canvasDims.current.w}
              imgHeight={canvasDims.current.h}
              showCrosshairs={settings.showCrosshairs}
            />
          )}
        </div>
        {settings?.showColorBar && metadata && (
          <TemperatureColorBar
            scaleMin={metadata.scaleMin}
            scaleMax={metadata.scaleMax}
            mean={metadata.mean}
            palette={settings.palette}
          />
        )}
      </div>
      <CameraControlPanel cameraIndex={cameraIndex} />
    </div>
  )
}

function CameraHeader({ title, status, fps, metadata, onFullscreen }: { title: string; status: string; fps?: number; metadata?: FrameMetadata | null; onFullscreen?: () => void }) {
  const statusConfig = {
    live: { color: 'text-green-400', dot: 'bg-green-400', label: 'Live' },
    connecting: { color: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse', label: 'Connecting...' },
    error: { color: 'text-red-400', dot: 'bg-red-400', label: 'Error' },
    offline: { color: 'text-zinc-600', dot: 'bg-zinc-600', label: 'Offline' }
  }[status] ?? { color: 'text-zinc-600', dot: 'bg-zinc-600', label: status }

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
      <h3 className="text-zinc-300 font-semibold text-sm">{title}</h3>
      <div className="flex items-center gap-3 text-xs">
        {metadata && metadata.mean > 0 && (
          <span className="text-zinc-400 font-mono">{metadata.mean.toFixed(1)}&deg;C</span>
        )}
        {fps !== undefined && fps > 0 && <span className="text-zinc-500">{fps} FPS</span>}
        <span className={`flex items-center gap-1 ${statusConfig.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
          {statusConfig.label}
        </span>
        {onFullscreen && (
          <button
            onClick={onFullscreen}
            className="text-zinc-500 hover:text-zinc-300 ml-1"
            title="Fullscreen"
          >
            {'\u26F6'}
          </button>
        )}
      </div>
    </div>
  )
}
