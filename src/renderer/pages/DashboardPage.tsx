import { useState, useCallback, useEffect } from 'react'
import { CameraFeed } from '../components/camera/CameraFeed'
import { JogPanel } from '../components/jog/JogPanel'
import { AxisStatus } from '../components/status/AxisStatus'
import { useAdsConnection } from '../hooks/useAdsConnection'
import { useMachineStore } from '../stores/machineStore'

export function DashboardPage() {
  const { connectionStatus, connectionError, connect, disconnect } = useAdsConnection()
  const connected = connectionStatus === 'connected'
  const setCameraStatus = useMachineStore((s) => s.setCameraStatus)
  const setCameraUrls = useMachineStore((s) => s.setCameraUrls)
  const meltpoolWsUrl = useMachineStore((s) => s.meltpoolWsUrl)
  const buildPlateWsUrl = useMachineStore((s) => s.buildPlateWsUrl)

  // Auto-start camera bridge on mount
  useEffect(() => {
    const unsub = window.machineAPI.camera.onStatusChange((status) => {
      setCameraStatus(status.running ? 'running' : status.error ? 'error' : 'stopped')
    })
    window.machineAPI.camera.status().then((s: { running: boolean; error: string | null }) => {
      if (!s.running) {
        setCameraStatus('starting')
        window.machineAPI.camera.start().then((result) => {
          if (result.success && result.meltpoolUrl && result.buildPlateUrl) {
            setCameraUrls(result.meltpoolUrl, result.buildPlateUrl)
          }
        })
      } else {
        setCameraStatus('running')
      }
    })
    return unsub
  }, [setCameraStatus, setCameraUrls])

  const allHomed = useMachineStore((s) => s.allHomed)
  const machineState = useMachineStore((s) => s.machineState)
  const toolMeasureComplete = useMachineStore((s) => s.toolMeasureComplete)
  const measuredZ = useMachineStore((s) => s.measuredZ)
  const measuredZ2 = useMachineStore((s) => s.measuredZ2)
  const zToolOffset = useMachineStore((s) => s.zToolOffset)
  const z2ToolOffset = useMachineStore((s) => s.z2ToolOffset)

  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const handleEnableSystem = useCallback(async (enable: boolean) => {
    try {
      await window.machineAPI.ads.enableSystem(enable)
      setStatusMsg(enable ? 'System enabled' : 'System disabled')
    } catch (err) {
      setStatusMsg(`Error: ${err}`)
    }
  }, [])

  const handleHomeSystem = useCallback(async () => {
    try {
      await window.machineAPI.ads.homeSystem()
      setStatusMsg('Homing sequence started...')
    } catch (err) {
      setStatusMsg(`Error: ${err}`)
    }
  }, [])

  const handleToolMeasure = useCallback(async () => {
    try {
      await window.machineAPI.ads.startToolMeasure()
      setStatusMsg('Tool measurement started...')
    } catch (err) {
      setStatusMsg(`Error: ${err}`)
    }
  }, [])

  const handleResetError = useCallback(async () => {
    try {
      await window.machineAPI.ads.resetError()
      setStatusMsg('Error reset sent')
    } catch (err) {
      setStatusMsg(`Error: ${err}`)
    }
  }, [])

  const isHoming = machineState >= 100 && machineState < 398
  const isMeasuring = machineState >= 398 && machineState <= 470
  const isError = machineState === 999

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Connect bar */}
      <div className="flex items-center gap-3">
        {connectionStatus === 'connected' ? (
          <button
            onClick={disconnect}
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600"
          >
            Disconnect PLC
          </button>
        ) : (
          <button
            onClick={connect}
            disabled={connectionStatus === 'connecting'}
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect PLC'}
          </button>
        )}
      </div>

      {/* Connection error */}
      {connectionError && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-2 text-xs text-red-400">
          <span className="font-medium">Connection failed: </span>
          {connectionError}
        </div>
      )}

      {/* System controls */}
      {connected && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <h2 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide mb-3">System Controls</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => handleEnableSystem(true)}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-green-700 border border-green-600 text-white hover:bg-green-600"
            >
              Enable System
            </button>
            <button
              onClick={() => handleEnableSystem(false)}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600"
            >
              Disable System
            </button>

            <div className="w-px h-6 bg-zinc-700" />

            <button
              onClick={handleHomeSystem}
              disabled={isHoming}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isHoming ? 'Homing...' : 'Home System'}
            </button>

            <button
              onClick={handleToolMeasure}
              disabled={!allHomed || isMeasuring}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isMeasuring ? 'Measuring...' : 'Tool Measure'}
            </button>

            <div className="w-px h-6 bg-zinc-700" />

            <button
              onClick={handleResetError}
              disabled={!isError}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-red-700 border border-red-600 text-white hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Reset Error
            </button>
          </div>

          {/* Tool measurement feedback */}
          {toolMeasureComplete && (
            <div className="mt-3 flex items-center gap-6 text-xs">
              <span className="text-zinc-500">Tool Offsets:</span>
              <span className="font-mono text-zinc-300">Z: {measuredZ.toFixed(3)} mm (offset: {zToolOffset.toFixed(3)})</span>
              <span className="font-mono text-zinc-300">Z2: {measuredZ2.toFixed(3)} mm (offset: {z2ToolOffset.toFixed(3)})</span>
            </div>
          )}

          {statusMsg && (
            <p className={`mt-2 text-xs ${statusMsg.includes('Error') ? 'text-red-400' : 'text-zinc-400'}`}>
              {statusMsg}
            </p>
          )}
        </div>
      )}

      {/* Camera feeds */}
      <div className="grid grid-cols-2 gap-4">
        <CameraFeed title="Meltpool Camera (PI 1M)" streamUrl={meltpoolWsUrl} mode="websocket" cameraIndex={0} />
        <CameraFeed title="Build Plate Camera (Xi 410)" streamUrl={buildPlateWsUrl} mode="websocket" cameraIndex={1} />
      </div>

      {/* Jog controls */}
      <JogPanel />

      {/* Axis status */}
      <AxisStatus />
    </div>
  )
}
