import { useRef, useEffect } from 'react'

// Demo scan data
const DEMO = { peakToValley: 0.142, rms: 0.023, points: 51200, minDev: -0.068, maxDev: 0.074 }

export function BuildPlateWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw a simple deviation heatmap
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

    // Generate a simple warped plate heatmap
    const gridSize = 40
    const cellW = dw / gridSize
    const cellH = dh / gridSize

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = (i / gridSize - 0.5) * 2
        const y = (j / gridSize - 0.5) * 2
        const z = Math.sin(x * 1.5) * 0.3 + Math.cos(y * 1.2) * 0.2 + (Math.sin(x * 3 + y * 2) * 0.05)
        const t = (z + 0.5) / 1.0 // normalize to 0-1

        // Blue → Green → Red
        let r = 0, g = 0, b = 0
        if (t < 0.5) { g = t * 2; b = 1 - t * 2 }
        else { r = (t - 0.5) * 2; g = 1 - (t - 0.5) * 2 }

        ctx.fillStyle = `rgb(${Math.floor(r * 255)},${Math.floor(g * 255)},${Math.floor(b * 255)})`
        ctx.fillRect(i * cellW, j * cellH, cellW + 0.5, cellH + 0.5)
      }
    }
  }, [])

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex flex-col">
      <h3 className="text-zinc-300 font-semibold text-xs uppercase tracking-wide mb-2">Build Plate Flatness</h3>
      <div className="flex-1 bg-zinc-800/50 rounded overflow-hidden" style={{ minHeight: '80px' }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
      </div>
      <div className="grid grid-cols-3 gap-1 mt-2">
        <div className="text-center">
          <div className="text-zinc-600 text-[8px] uppercase">P-V</div>
          <div className="text-yellow-400 font-mono text-[10px]">{DEMO.peakToValley} mm</div>
        </div>
        <div className="text-center">
          <div className="text-zinc-600 text-[8px] uppercase">RMS</div>
          <div className="text-green-400 font-mono text-[10px]">{DEMO.rms} mm</div>
        </div>
        <div className="text-center">
          <div className="text-zinc-600 text-[8px] uppercase">Points</div>
          <div className="text-blue-400 font-mono text-[10px]">{(DEMO.points / 1000).toFixed(1)}K</div>
        </div>
      </div>
    </div>
  )
}
