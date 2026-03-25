import { useMachineStore } from '../../stores/machineStore'

export function MeltpoolWidget() {
  // Pull latest meltpool metadata from camera feed (if available)
  // For now, placeholder — will be populated by meltpool analysis
  const cameraSettings = useMachineStore((s) => s.cameraSettings[0])

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex flex-col h-full">
      <h3 className="text-zinc-300 font-semibold text-xs uppercase tracking-wide mb-2">Meltpool Geometry</h3>
      <div className="flex-1 flex items-center justify-center bg-zinc-800/50 rounded min-h-[120px]">
        <div className="text-center">
          <div className="text-orange-500 text-2xl mb-1">{'\u2B24'}</div>
          <div className="text-zinc-600 text-[10px]">Meltpool analysis</div>
          <div className="text-zinc-700 text-[9px]">Awaiting scanner integration</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 mt-2">
        <div className="text-center">
          <div className="text-zinc-600 text-[9px] uppercase">Width</div>
          <div className="text-zinc-500 font-mono text-[10px]">--</div>
        </div>
        <div className="text-center">
          <div className="text-zinc-600 text-[9px] uppercase">Length</div>
          <div className="text-zinc-500 font-mono text-[10px]">--</div>
        </div>
        <div className="text-center">
          <div className="text-zinc-600 text-[9px] uppercase">Area</div>
          <div className="text-zinc-500 font-mono text-[10px]">--</div>
        </div>
      </div>
    </div>
  )
}
