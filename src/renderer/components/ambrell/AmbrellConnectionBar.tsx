import { useAmbrellStore } from '../../stores/ambrellStore'

export function AmbrellConnectionBar() {
  const status = useAmbrellStore((s) => s.connectionStatus)
  const error = useAmbrellStore((s) => s.connectionError)
  const setStatus = useAmbrellStore((s) => s.setConnectionStatus)

  const handleConnect = () => {
    setStatus('connecting')
    // TODO: Establish RS485 serial connection to Ambrell
    // For now, simulate connection
    setTimeout(() => setStatus('connected'), 1000)
  }

  const handleDisconnect = () => {
    setStatus('disconnected')
  }

  const statusDot = {
    disconnected: 'bg-zinc-500',
    connecting: 'bg-yellow-400 animate-pulse',
    connected: 'bg-green-400',
    error: 'bg-red-400'
  }[status]

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusDot}`} />
          <span className="text-zinc-400 text-xs font-medium">
            Ambrell EASYHEAT 8310
          </span>
        </div>
        <span className="text-zinc-600 text-xs">10 kW | 150-400 kHz</span>
        {status === 'connected' && (
          <span className="text-green-400 text-xs">Connected (RS485)</span>
        )}
        {error && (
          <span className="text-red-400 text-xs">{error}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {status === 'connected' ? (
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 text-xs rounded bg-zinc-700 border border-zinc-600 text-zinc-400 hover:bg-zinc-600"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={status === 'connecting'}
            className="px-3 py-1 text-xs rounded bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {status === 'connecting' ? 'Connecting...' : 'Connect'}
          </button>
        )}
      </div>
    </div>
  )
}
