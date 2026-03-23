import { JogButton } from './JogButton'
import { useAxisPosition } from '../../hooks/useAxisPosition'
import { useMachineStore } from '../../stores/machineStore'
import type { AxisId } from '../../types/machine'
import { MM_TO_IN, MMS_TO_IPM } from '../../types/machine'

interface AxisControlProps {
  axis: AxisId
  disabled: boolean
}

const AXIS_LABELS: Record<AxisId, { name: string; backward: string; forward: string }> = {
  x: { name: 'X', backward: '\u25C4', forward: '\u25BA' },
  y: { name: 'Y', backward: '\u25C4', forward: '\u25BA' },
  z: { name: 'Z', backward: '\u25BC', forward: '\u25B2' },
  z2: { name: 'Z2', backward: '\u25BC', forward: '\u25B2' },
  ext: { name: 'EXT', backward: '\u25C4', forward: '\u25BA' }
}

export function AxisControl({ axis, disabled }: AxisControlProps) {
  const axisState = useAxisPosition(axis)
  const jogDistance = useMachineStore((s) => s.jogDistance)
  const labels = AXIS_LABELS[axis]
  const incremental = jogDistance !== 'continuous'

  // Convert mm to inches for display
  const posInches = axisState.actualPosition * MM_TO_IN
  // Convert mm/s to in/min for display
  const velIpm = axisState.actualVelocity * MMS_TO_IPM

  return (
    <div className="flex items-center gap-4">
      <span className="text-zinc-400 font-mono font-bold text-lg w-8">{labels.name}</span>

      <JogButton
        label={labels.backward}
        axis={axis}
        direction="backward"
        disabled={disabled}
        incremental={incremental}
      />
      <JogButton
        label={labels.forward}
        axis={axis}
        direction="forward"
        disabled={disabled}
        incremental={incremental}
      />

      <div className="flex-1 flex items-center gap-6 ml-4">
        <div className="font-mono text-base">
          <span className="text-zinc-500 text-xs mr-1">POS</span>
          <span className={axisState.error ? 'text-red-400' : 'text-green-400'}>
            {posInches.toFixed(4)}
          </span>
          <span className="text-zinc-600 text-xs ml-1">in</span>
        </div>

        <div className="font-mono text-sm">
          <span className="text-zinc-500 text-xs mr-1">VEL</span>
          <span className="text-zinc-300">
            {velIpm.toFixed(1)}
          </span>
          <span className="text-zinc-600 text-xs ml-1">in/min</span>
        </div>

        {axisState.error && (
          <span className="text-red-400 text-xs font-mono">
            ERR 0x{axisState.errorId.toString(16).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  )
}
