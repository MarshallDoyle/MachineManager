export function ScannerWidget() {
  // Demo scan data — will be replaced with live scanner feed
  const hasScan = true
  const demo = {
    points: 51200,
    rms: 0.023,
    peakToValley: 0.142,
    minDev: -0.068,
    maxDev: 0.074,
    lastScanTime: '2 min ago'
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-zinc-300 font-semibold text-xs uppercase tracking-wide">Laser Scanner</h3>
        <span className="text-zinc-600 text-[9px]">scanCONTROL 3002-25</span>
      </div>

      {hasScan ? (
        <>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <div className="bg-zinc-800/50 rounded px-2 py-1">
              <div className="text-zinc-600 text-[8px] uppercase">Points</div>
              <div className="font-mono text-xs text-blue-400">{demo.points.toLocaleString()}</div>
            </div>
            <div className="bg-zinc-800/50 rounded px-2 py-1">
              <div className="text-zinc-600 text-[8px] uppercase">RMS Dev</div>
              <div className="font-mono text-xs text-green-400">{demo.rms.toFixed(3)} mm</div>
            </div>
            <div className="bg-zinc-800/50 rounded px-2 py-1">
              <div className="text-zinc-600 text-[8px] uppercase">Peak-Valley</div>
              <div className="font-mono text-xs text-yellow-400">{demo.peakToValley.toFixed(3)} mm</div>
            </div>
            <div className="bg-zinc-800/50 rounded px-2 py-1">
              <div className="text-zinc-600 text-[8px] uppercase">Last Scan</div>
              <div className="font-mono text-xs text-zinc-400">{demo.lastScanTime}</div>
            </div>
          </div>

          {/* Mini deviation bar */}
          <div className="mb-2">
            <div className="text-zinc-600 text-[8px] uppercase mb-0.5">Deviation Range</div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-mono text-cyan-400">{demo.minDev.toFixed(3)}</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-green-500 to-red-600 opacity-40 rounded-full" />
                <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${((0 - demo.minDev) / (demo.maxDev - demo.minDev)) * 100}%` }} />
              </div>
              <span className="text-[9px] font-mono text-red-400">{demo.maxDev.toFixed(3)}</span>
            </div>
          </div>

          <button
            disabled
            className="w-full px-2 py-1 text-[10px] font-medium rounded bg-zinc-700 border border-zinc-600 text-zinc-400 opacity-50 cursor-not-allowed"
          >
            Scan (Scanner not connected)
          </button>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs py-4">
          No scanner connected
        </div>
      )}
    </div>
  )
}
