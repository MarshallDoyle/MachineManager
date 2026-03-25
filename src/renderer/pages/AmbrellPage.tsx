import { AmbrellConnectionBar } from '../components/ambrell/AmbrellConnectionBar'
import { AmbrellReadouts } from '../components/ambrell/AmbrellReadouts'
import { AmbrellControls } from '../components/ambrell/AmbrellControls'
import { AmbrellPidPanel } from '../components/ambrell/AmbrellPidPanel'

export function AmbrellPage() {
  return (
    <div className="space-y-4 max-w-[1200px]">
      <h1 className="text-zinc-300 font-semibold text-lg">Ambrell EASYHEAT 8310</h1>

      <AmbrellConnectionBar />

      <div className="grid grid-cols-2 gap-4">
        {/* Left column: readouts */}
        <AmbrellReadouts />

        {/* Right column: controls */}
        <AmbrellControls />
      </div>

      {/* PID panel (only in auto mode) */}
      <AmbrellPidPanel />

      {/* System info */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
        <h3 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide mb-2">System Information</h3>
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-zinc-500">Model</span>
            <div className="text-zinc-300 font-mono">EASYHEAT 8310</div>
          </div>
          <div>
            <span className="text-zinc-500">Max Power</span>
            <div className="text-zinc-300 font-mono">10 kW</div>
          </div>
          <div>
            <span className="text-zinc-500">Frequency Range</span>
            <div className="text-zinc-300 font-mono">150-400 kHz</div>
          </div>
          <div>
            <span className="text-zinc-500">Interface</span>
            <div className="text-zinc-300 font-mono">RS485 / 0-10V Analog</div>
          </div>
        </div>
      </div>
    </div>
  )
}
