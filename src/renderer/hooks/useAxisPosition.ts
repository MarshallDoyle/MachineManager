import { useMachineStore } from '../stores/machineStore'
import type { AxisId } from '../types/machine'

export function useAxisPosition(axis: AxisId) {
  return useMachineStore((s) => s.axes[axis])
}
