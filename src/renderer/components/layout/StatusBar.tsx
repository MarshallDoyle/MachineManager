import { ConnectionStatus } from '../status/ConnectionStatus'
import { RecordingIndicator } from '../recording/RecordingIndicator'
import { useMachineStore } from '../../stores/machineStore'

export function StatusBar() {
  const adsConfig = useMachineStore((s) => s.adsConfig)
  const connectionStatus = useMachineStore((s) => s.connectionStatus)
  const cameraStatus = useMachineStore((s) => s.cameraStatus)

  return (
    <div className="h-7 bg-zinc-950 border-t border-zinc-800 flex items-center px-4 justify-between text-xs">
      <div className="flex items-center gap-4">
        <ConnectionStatus />
        {connectionStatus === 'connected' && (
          <span className="text-zinc-600">
            {adsConfig.targetAmsNetId}:{adsConfig.targetAdsPort}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <RecordingIndicator />
        <span className="text-zinc-600">
          Cameras: <span className={cameraStatus === 'running' ? 'text-green-400' : 'text-zinc-500'}>{cameraStatus}</span>
        </span>
      </div>
    </div>
  )
}
