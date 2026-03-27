import { useRef, useEffect } from 'react'

// Demo meltpool data — simulated measurements
const DEMO_DATA = {
  width: 2.4,    // mm
  length: 3.1,   // mm
  area: 5.8,     // mm²
  depth: 0.8,    // mm
  aspect: 1.29   // length/width ratio
}

export function MeltpoolWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw a simple meltpool visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width = canvas.offsetWidth * 2
    const h = canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)
    const dw = canvas.offsetWidth
    const dh = canvas.offsetHeight

    ctx.fillStyle = '#18181b'
    ctx.fillRect(0, 0, dw, dh)

    // Draw meltpool ellipse with heat gradient
    const cx = dw / 2
    const cy = dh / 2
    const rx = 28
    const ry = 22

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.3, '#ffdd44')
    gradient.addColorStop(0.6, '#ff6600')
    gradient.addColorStop(0.85, '#cc2200')
    gradient.addColorStop(1, '#330000')

    ctx.beginPath()
    ctx.ellipse(cx, cy - 2, rx, ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    // Crosshair
    ctx.strokeStyle = '#ffffff40'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(cx - rx - 5, cy); ctx.lineTo(cx + rx + 5, cy)
    ctx.moveTo(cx, cy - ry - 5); ctx.lineTo(cx, cy + ry + 5)
    ctx.stroke()
  }, [])

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex flex-col">
      <h3 className="text-zinc-300 font-semibold text-xs uppercase tracking-wide mb-2">Meltpool Geometry</h3>
      <div className="flex-1 bg-zinc-800/50 rounded overflow-hidden" style={{ minHeight: '80px' }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
      </div>
      <div className="grid grid-cols-3 gap-1 mt-2">
        <div className="text-center">
          <div className="text-zinc-600 text-[8px] uppercase">Width</div>
          <div className="text-orange-400 font-mono text-[10px]">{DEMO_DATA.width} mm</div>
        </div>
        <div className="text-center">
          <div className="text-zinc-600 text-[8px] uppercase">Length</div>
          <div className="text-orange-400 font-mono text-[10px]">{DEMO_DATA.length} mm</div>
        </div>
        <div className="text-center">
          <div className="text-zinc-600 text-[8px] uppercase">Area</div>
          <div className="text-orange-400 font-mono text-[10px]">{DEMO_DATA.area} mm²</div>
        </div>
      </div>
    </div>
  )
}
