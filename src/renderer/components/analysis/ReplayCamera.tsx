import { useEffect, useRef, useState } from 'react'

interface ReplayCameraProps {
  title: string
  recordingId: string
  camera: string
  frameIndex: number
}

export function ReplayCamera({ title, recordingId, camera, frameIndex }: ReplayCameraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const lastFrameRef = useRef(-1)

  useEffect(() => {
    if (frameIndex === lastFrameRef.current) return
    lastFrameRef.current = frameIndex

    window.machineAPI.recording.readFrame(recordingId, camera, frameIndex).then((data) => {
      if (!data) return
      const canvas = canvasRef.current
      if (!canvas) return
      if (!ctxRef.current) ctxRef.current = canvas.getContext('2d')
      const ctx = ctxRef.current
      if (!ctx) return

      const blob = new Blob([data], { type: 'image/jpeg' })
      const url = URL.createObjectURL(blob)
      const img = new window.Image()
      img.onload = () => {
        if (canvas.width !== img.width || canvas.height !== img.height) {
          canvas.width = img.width
          canvas.height = img.height
        }
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
      }
      img.src = url
    })
  }, [recordingId, camera, frameIndex])

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden flex flex-col">
      <div className="px-3 py-1.5 border-b border-zinc-700 flex items-center justify-between">
        <h3 className="text-zinc-300 font-semibold text-xs">{title}</h3>
        <span className="text-zinc-500 text-[10px] font-mono">Frame {frameIndex}</span>
      </div>
      <div className="flex-1 bg-black flex items-center justify-center min-h-[120px]">
        <canvas ref={canvasRef} className="w-full" style={{ imageRendering: 'auto' }} />
      </div>
    </div>
  )
}
