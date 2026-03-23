import { useMemo } from 'react'
import { PointCloudCanvas, generateDemoData } from '../components/scan/PointCloudScene'
import { FlatnessStats } from '../components/scan/FlatnessStats'

export function BuildPlateScanPage() {
  const data = useMemo(() => generateDemoData(100, 200, 200), [])

  return (
    <div className="h-full flex flex-col gap-4 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <h1 className="text-zinc-300 font-semibold text-lg">Build Plate Scan</h1>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-zinc-700 border border-zinc-600 text-zinc-400 opacity-50 cursor-not-allowed"
          >
            Start Scan (Scanner not connected)
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* 3D viewport */}
        <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
          <PointCloudCanvas data={data} />
        </div>

        {/* Stats sidebar */}
        <div className="w-64 space-y-4 shrink-0">
          <FlatnessStats
            min={data.stats.min}
            max={data.stats.max}
            mean={data.stats.mean}
            rms={data.stats.rms}
            pointCount={data.count}
          />

          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
            <h3 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide mb-2">Scanner</h3>
            <p className="text-zinc-500 text-xs">
              No scanner hardware connected. Showing demo data.
            </p>
            <p className="text-zinc-600 text-xs mt-2">
              Connect a scanner to capture real build plate surface data.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
            <h3 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide mb-2">Controls</h3>
            <p className="text-zinc-500 text-xs">
              Left click + drag to rotate. Scroll to zoom. Right click + drag to pan.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
