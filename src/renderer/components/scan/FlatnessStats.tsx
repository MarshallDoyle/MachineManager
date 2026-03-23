interface FlatnessStatsProps {
  min: number
  max: number
  mean: number
  rms: number
  pointCount: number
}

export function FlatnessStats({ min, max, mean, rms, pointCount }: FlatnessStatsProps) {
  const peakToValley = max - min

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-3">
      <h3 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide">Flatness Statistics</h3>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-zinc-500">Min Deviation</span>
          <span className="font-mono text-cyan-400">{min.toFixed(3)} mm</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Max Deviation</span>
          <span className="font-mono text-red-400">{max.toFixed(3)} mm</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Peak-to-Valley</span>
          <span className="font-mono text-yellow-400">{peakToValley.toFixed(3)} mm</span>
        </div>

        <div className="border-t border-zinc-700 pt-2" />

        <div className="flex justify-between">
          <span className="text-zinc-500">Mean</span>
          <span className="font-mono text-zinc-300">{mean.toFixed(4)} mm</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">RMS</span>
          <span className="font-mono text-zinc-300">{rms.toFixed(4)} mm</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Points</span>
          <span className="font-mono text-zinc-300">{pointCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Color legend */}
      <div className="border-t border-zinc-700 pt-3">
        <span className="text-zinc-500 text-[10px] uppercase tracking-wide">Color Legend</span>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-3 rounded-sm" style={{ background: 'linear-gradient(to right, #0066ff, #00cc00, #ff3300)' }} />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
          <span>Low</span>
          <span>Nominal</span>
          <span>High</span>
        </div>
      </div>
    </div>
  )
}
