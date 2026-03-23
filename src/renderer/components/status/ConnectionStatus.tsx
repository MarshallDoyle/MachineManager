import { useMachineStore } from '../../stores/machineStore'
import type { ConnectionStatus as ConnectionStatusType } from '../../types/machine'

const STATUS_CONFIG: Record<ConnectionStatusType, { color: string; bg: string; label: string }> = {
  disconnected: { color: 'text-zinc-500', bg: 'bg-zinc-600', label: 'Disconnected' },
  connecting: { color: 'text-yellow-400', bg: 'bg-yellow-400', label: 'Connecting...' },
  connected: { color: 'text-green-400', bg: 'bg-green-400', label: 'Connected' },
  error: { color: 'text-red-400', bg: 'bg-red-400', label: 'Error' }
}

export function ConnectionStatus() {
  const status = useMachineStore((s) => s.connectionStatus)
  const config = STATUS_CONFIG[status]

  return (
    <span className={`flex items-center gap-1.5 text-xs ${config.color}`}>
      <span className={`w-2 h-2 rounded-full ${config.bg} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  )
}
