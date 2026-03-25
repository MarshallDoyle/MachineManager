export function BuildPlateWidget() {
  // Placeholder data — will be fed by scanner when connected
  const stats = { peakToValley: 0.0, rms: 0.0, points: 0 }
  const hasData = stats.points > 0

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex flex-col h-full">
      <h3 className="text-zinc-300 font-semibold text-xs uppercase tracking-wide mb-2">Build Plate Flatness</h3>
      <div className="flex-1 flex items-center justify-center bg-zinc-800/50 rounded min-h-[120px]">
        {hasData ? (
          <div className="text-center">
            <div className="text-zinc-300 font-mono text-sm">{stats.peakToValley.toFixed(3)} mm</div>
            <div className="text-zinc-500 text-[10px]">Peak-to-Valley</div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-zinc-600 text-2xl mb-1">{'\u25CE'}</div>
            <div className="text-zinc-600 text-[10px]">No scan data</div>
            <div className="text-zinc-700 text-[9px]">Scanner not connected</div>
          </div>
        )}
      </div>
      {hasData && (
        <div className="flex justify-between mt-2 text-[10px]">
          <span className="text-zinc-500">RMS: <span className="text-zinc-300 font-mono">{stats.rms.toFixed(4)} mm</span></span>
          <span className="text-zinc-500">Points: <span className="text-zinc-300 font-mono">{stats.points.toLocaleString()}</span></span>
        </div>
      )}
    </div>
  )
}
