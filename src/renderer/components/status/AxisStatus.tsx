import { useMachineStore } from '../../stores/machineStore'
import type { AxisId } from '../../types/machine'

const AXIS_STATE_NAMES: Record<number, string> = {
  0: 'Disabled',
  1: 'Standstill',
  2: 'Homing',
  3: 'Moving',
  4: 'Constant Vel',
  5: 'Accelerating',
  6: 'Decelerating',
  7: 'Error'
}

const MACHINE_STATE_NAMES: Record<number, string> = {
  0: 'Idle',
  10: 'Initializing',
  100: 'Homing Z2',
  120: 'Homing Z',
  140: 'Homing X',
  160: 'Homing Y',
  200: 'Building Group',
  215: 'Group Built',
  230: 'Coupling Y',
  398: 'Tool Measure Start',
  400: 'Measuring Z',
  440: 'Measuring Z2',
  470: 'Tool Measure Done',
  70: 'Ready',
  999: 'Error'
}

export function AxisStatus() {
  const axes = useMachineStore((s) => s.axes)
  const plcReady = useMachineStore((s) => s.plcReady)
  const machineState = useMachineStore((s) => s.machineState)
  const allHomed = useMachineStore((s) => s.allHomed)
  const groupBuilt = useMachineStore((s) => s.groupBuilt)
  const toolMeasureComplete = useMachineStore((s) => s.toolMeasureComplete)

  const machineStateName = MACHINE_STATE_NAMES[machineState] ?? `State ${machineState}`

  const renderAxis = (id: AxisId, label: string) => {
    const axis = axes[id]
    const stateName = AXIS_STATE_NAMES[axis.axisState] ?? `State ${axis.axisState}`
    const isError = axis.error

    return (
      <div key={id} className="flex items-center gap-2">
        <span className="text-zinc-400 font-mono font-bold">{label}</span>
        <span className={`text-xs ${isError ? 'text-red-400' : 'text-zinc-300'}`}>
          {isError ? `Error (0x${axis.errorId.toString(16).toUpperCase()})` : stateName}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h3 className="text-zinc-500 font-semibold text-xs uppercase tracking-wide">Axis Status</h3>
          {renderAxis('x', 'X')}
          {renderAxis('y', 'Y')}
          {renderAxis('z', 'Z')}
          {renderAxis('z2', 'Z2')}
          {renderAxis('ext', 'EXT')}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500">PLC:</span>
          <span className={plcReady ? 'text-green-400' : 'text-zinc-500'}>
            {plcReady ? 'Ready' : 'Not Ready'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="text-zinc-500">Machine:</span>
        <span className={machineState === 999 ? 'text-red-400 font-medium' : 'text-zinc-300'}>
          {machineStateName}
        </span>

        <div className="flex items-center gap-3 ml-auto">
          <StatusBadge label="Homed" active={allHomed} />
          <StatusBadge label="Group" active={groupBuilt} />
          <StatusBadge label="Tool" active={toolMeasureComplete} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
      active
        ? 'bg-green-900/40 text-green-400 border border-green-800'
        : 'bg-zinc-800 text-zinc-600 border border-zinc-700'
    }`}>
      {label}
    </span>
  )
}
