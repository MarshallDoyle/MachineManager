import { useState, useCallback, useEffect } from 'react'
import { CameraFeed } from '../components/camera/CameraFeed'
import { JogPanel } from '../components/jog/JogPanel'
// AxisStatus readouts now integrated into JogPanel
import { useAdsConnection } from '../hooks/useAdsConnection'
import { useMachineStore } from '../stores/machineStore'
import { useRecordingStore } from '../stores/recordingStore'
import { AmbrellDashboardWidget } from '../components/ambrell/AmbrellDashboardWidget'
import { BuildPlateWidget } from '../components/dashboard/BuildPlateWidget'
import { MeltpoolWidget } from '../components/dashboard/MeltpoolWidget'
import { RunNotes } from '../components/dashboard/RunNotes'

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

  // Recording
  const isRecording = useRecordingStore((s) => s.isRecording)
  const setRecordingStatus = useRecordingStore((s) => s.setRecordingStatus)
  const programLoaded = useMachineStore((s) => s.programLoaded)
  const gcodeFileName = useMachineStore((s) => s.gcodeFileName)

  useEffect(() => {
    const unsub = window.machineAPI.recording.onStatusChange((status) => {
      setRecordingStatus(status)
    })
    return unsub
  }, [setRecordingStatus])

  const handleRunMachine = useCallback(async () => {
    if (!gcodeFileName) {
      setStatusMsg('No G-code program loaded. Load one from the G-Code page first.')
      return
    }
    try {
      await window.machineAPI.recording.start(gcodeFileName)
      await window.machineAPI.gcode.run()
      setStatusMsg('Build started — recording...')
    } catch (err) {
      setStatusMsg(`Error starting build: ${err}`)
    }
  }, [gcodeFileName])

  const handleStopBuild = useCallback(async () => {
    try {
      await window.machineAPI.gcode.stop()
      await window.machineAPI.recording.stop()
      setStatusMsg('Build stopped')
    } catch (err) {
      setStatusMsg(`Error stopping build: ${err}`)
    }
  }, [])

  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveFileName, setSaveFileName] = useState('')

  const handleRecordToggle = useCallback(async () => {
    if (!isRecording) {
      // Start recording immediately with a temp name
      try {
        await window.machineAPI.recording.start('recording')
        setStatusMsg('Recording started...')
      } catch (err) {
        setStatusMsg(`Error: ${err}`)
      }
    } else {
      // Show save dialog before stopping
      setSaveFileName(gcodeFileName?.replace(/\.[^.]+$/, '') || `Build_${new Date().toISOString().slice(0, 10)}`)
      setShowSaveDialog(true)
    }
  }, [isRecording, gcodeFileName])

  const handleSaveRecording = useCallback(async () => {
    setShowSaveDialog(false)
    try {
      await window.machineAPI.recording.stop()
      setStatusMsg(`Recording saved as "${saveFileName}"`)
    } catch (err) {
      setStatusMsg(`Error: ${err}`)
    }
  }, [saveFileName])

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

        <div className="w-px h-6 bg-zinc-700" />

        {/* Record button — always available */}
        <button
          onClick={handleRecordToggle}
          className={`px-4 py-1.5 text-xs font-bold rounded-md border flex items-center gap-2 ${
            isRecording
              ? 'bg-red-900/50 border-red-600 text-red-300 hover:bg-red-900/70'
              : 'bg-zinc-700 border-zinc-600 text-zinc-300 hover:bg-zinc-600'
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${
            isRecording ? 'bg-red-500 animate-[pulse_2s_ease-in-out_infinite]' : 'bg-red-700'
          }`} />
          {isRecording ? 'Stop Recording' : 'Record'}
        </button>

        {/* Run Machine button */}
        {!isRecording ? (
          <button
            onClick={handleRunMachine}
            disabled={!connected || !allHomed || !programLoaded}
            className="px-5 py-1.5 text-xs font-bold rounded-md bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Run Machine
          </button>
        ) : (
          <button
            onClick={handleStopBuild}
            className="px-5 py-1.5 text-xs font-bold rounded-md bg-red-600 border border-red-500 text-white hover:bg-red-500 animate-pulse"
          >
            Stop Build
          </button>
        )}
      </div>

      {/* Save recording dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-zinc-200 font-semibold text-sm mb-3">Save Recording</h3>
            <label className="block text-zinc-500 text-xs mb-1">Recording Name</label>
            <input
              type="text"
              value={saveFileName}
              onChange={(e) => setSaveFileName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRecording() }}
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-600 rounded-md text-zinc-200 focus:outline-none focus:border-blue-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowSaveDialog(false); window.machineAPI.recording.stop() }}
                className="px-4 py-1.5 text-xs rounded-md bg-zinc-700 border border-zinc-600 text-zinc-400 hover:bg-zinc-600"
              >
                Discard
              </button>
              <button
                onClick={handleSaveRecording}
                className="px-4 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection error with diagnostics */}
      {connectionError && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-xs text-red-400">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-semibold">Connection failed: </span>
              {connectionError}
            </div>
          </div>
          <div className="mt-2 text-red-400/70">
            Target: <span className="font-mono">{useMachineStore.getState().adsConfig.targetAmsNetId}:{useMachineStore.getState().adsConfig.targetAdsPort}</span>
            <span className="ml-3">Check Settings page to verify AMS NetId and ensure CX5340 is powered on with TwinCAT in Run mode.</span>
          </div>
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

      {/* Camera feeds — fixed height row */}
      <div className="grid grid-cols-2 gap-3 overflow-hidden" style={{ maxHeight: '340px' }}>
        <CameraFeed title="Meltpool Camera (PI 1M)" streamUrl={meltpoolWsUrl} mode="websocket" cameraIndex={0} />
        <CameraFeed title="Build Plate Camera (Xi 410)" streamUrl={buildPlateWsUrl} mode="websocket" cameraIndex={1} />
      </div>

      {/* Middle row: monitoring widgets */}
      <div className="grid grid-cols-3 gap-3">
        <MeltpoolWidget />
        <BuildPlateWidget />
        <RunNotes />
      </div>

      {/* Ambrell heater — full width, prominent */}
      <AmbrellDashboardWidget />

      {/* Jog controls */}
      <JogPanel />
    </div>
  )
}
