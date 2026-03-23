import { useState, useCallback } from 'react'
import { useMachineStore } from '../stores/machineStore'

const INTERPRETER_STATE_NAMES: Record<number, string> = {
  0: 'Idle',
  1: 'Ready',
  2: 'Running',
  3: 'Waiting',
  4: 'Stopped',
  5: 'Done',
  12: 'Error'
}

export function GcodePage() {
  const connectionStatus = useMachineStore((s) => s.connectionStatus)
  const connected = connectionStatus === 'connected'
  const programLoaded = useMachineStore((s) => s.programLoaded)
  const programRunning = useMachineStore((s) => s.programRunning)
  const programError = useMachineStore((s) => s.programError)
  const interpreterState = useMachineStore((s) => s.interpreterState)
  const allHomed = useMachineStore((s) => s.allHomed)
  const feedOverride = useMachineStore((s) => s.feedOverride)
  const setFeedOverride = useMachineStore((s) => s.setFeedOverride)

  const [gcodeText, setGcodeText] = useState('')
  const [fileName, setFileName] = useState('PrintJob.nc')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const handleLoadFile = useCallback(async () => {
    try {
      const result = await window.machineAPI.gcode.loadFile()
      if (result) {
        setGcodeText(result.content)
        setFileName(result.fileName)
        setStatusMessage(`Loaded: ${result.fileName}`)
      }
    } catch (err) {
      setStatusMessage(`Error loading file: ${err}`)
    }
  }, [])

  const handleSaveAndLoad = useCallback(async () => {
    if (!gcodeText.trim()) {
      setStatusMessage('No G-code to save')
      return
    }
    try {
      setStatusMessage('Saving and loading on PLC...')
      const result = await window.machineAPI.gcode.saveAndLoad(gcodeText, fileName)
      if (result.success) {
        setStatusMessage(`Saved to ${result.savedPath} and loaded on PLC`)
      } else {
        setStatusMessage(`Failed: ${result.error}`)
      }
    } catch (err) {
      setStatusMessage(`Error: ${err}`)
    }
  }, [gcodeText, fileName])

  const handleRunGcode = useCallback(async () => {
    try {
      setStatusMessage('Starting program...')
      const result = await window.machineAPI.gcode.run()
      if (result.success) {
        setStatusMessage('Program started')
      } else {
        setStatusMessage(`Run failed: ${result.error}`)
      }
    } catch (err) {
      setStatusMessage(`Error: ${err}`)
    }
  }, [])

  const handleStopGcode = useCallback(async () => {
    try {
      const result = await window.machineAPI.gcode.stop()
      if (result.success) {
        setStatusMessage('Program stopped')
      } else {
        setStatusMessage(`Stop failed: ${result.error}`)
      }
    } catch (err) {
      setStatusMessage(`Error: ${err}`)
    }
  }, [])

  const handleResetInterpreter = useCallback(async () => {
    try {
      const result = await window.machineAPI.gcode.reset()
      if (result.success) {
        setStatusMessage('Interpreter reset')
      } else {
        setStatusMessage(`Reset failed: ${result.error}`)
      }
    } catch (err) {
      setStatusMessage(`Error: ${err}`)
    }
  }, [])

  const lineCount = gcodeText ? gcodeText.split('\n').length : 0
  const interpStateName = INTERPRETER_STATE_NAMES[interpreterState] ?? `State ${interpreterState}`

  return (
    <div className="h-full flex flex-col gap-4 max-w-[1100px]">
      <h1 className="text-zinc-300 text-lg font-semibold">G-Code Program</h1>

      {/* NCI Status bar */}
      {connected && (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Interpreter:</span>
            <span className={
              programError ? 'text-red-400 font-medium' :
              programRunning ? 'text-green-400 font-medium' :
              'text-zinc-300'
            }>
              {interpStateName}
            </span>
          </div>

          <StatusBadge label="Loaded" active={programLoaded} />
          <StatusBadge label="Running" active={programRunning} color="green" />
          {programError && <StatusBadge label="Error" active={true} color="red" />}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLoadFile}
            className="px-4 py-2 text-xs font-medium rounded-md bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600"
          >
            Load File
          </button>

          <button
            onClick={handleSaveAndLoad}
            disabled={!connected || !gcodeText.trim() || !allHomed}
            className="
              px-4 py-2 text-xs font-medium rounded-md
              bg-blue-600 text-white hover:bg-blue-500
              disabled:opacity-30 disabled:cursor-not-allowed
            "
          >
            Save & Load to PLC
          </button>

          {programRunning ? (
            <button
              onClick={handleStopGcode}
              className="px-4 py-2 text-xs font-bold rounded-md bg-red-700 border border-red-500 text-white hover:bg-red-600"
            >
              Stop Program
            </button>
          ) : (
            <button
              onClick={handleRunGcode}
              disabled={!connected || !programLoaded}
              className="
                px-4 py-2 text-xs font-medium rounded-md
                bg-green-700 border border-green-500 text-white
                hover:bg-green-600
                disabled:opacity-30 disabled:cursor-not-allowed
              "
            >
              Run Program
            </button>
          )}

          <button
            onClick={handleResetInterpreter}
            disabled={!connected || programRunning}
            className="
              px-4 py-2 text-xs font-medium rounded-md
              bg-zinc-700 border border-zinc-600 text-zinc-300
              hover:bg-zinc-600
              disabled:opacity-30 disabled:cursor-not-allowed
            "
          >
            Reset Interpreter
          </button>
        </div>

        {/* File info */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-zinc-500">{lineCount} lines</span>
        </div>
      </div>

      {/* Feed override */}
      {connected && (
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2">
          <span className="text-zinc-400 text-xs font-medium">Feed Override:</span>
          <input
            type="range"
            min={0}
            max={100}
            value={feedOverride}
            onChange={(e) => setFeedOverride(Number(e.target.value))}
            className="flex-1 accent-blue-500 h-1.5"
          />
          <span className="text-zinc-300 text-xs font-mono w-10 text-right">{feedOverride}%</span>
        </div>
      )}

      {/* File name header */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-t-lg px-4 py-2 flex items-center justify-between">
        <input
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="bg-transparent text-zinc-300 text-sm font-mono focus:outline-none focus:text-white border-b border-transparent focus:border-zinc-500 w-64"
          placeholder="filename.nc"
        />
        {gcodeText && (
          <button
            onClick={() => { setGcodeText(''); setFileName('PrintJob.nc') }}
            className="text-zinc-500 hover:text-zinc-300 text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* G-code editor */}
      <div className="flex-1 relative -mt-4">
        <div className="absolute inset-0 flex bg-zinc-900 border border-zinc-700 border-t-0 rounded-b-lg overflow-hidden">
          {/* Line numbers */}
          <div className="bg-zinc-950 text-zinc-600 text-xs font-mono py-3 px-2 text-right select-none overflow-hidden min-w-[3rem]">
            {(gcodeText || ' ').split('\n').map((_, i) => (
              <div key={i} className="leading-5">{i + 1}</div>
            ))}
          </div>

          {/* Text area */}
          <textarea
            value={gcodeText}
            onChange={(e) => setGcodeText(e.target.value)}
            placeholder="Paste or type G-code here, or load a file..."
            spellCheck={false}
            className="
              flex-1 bg-transparent text-zinc-200 text-xs font-mono
              p-3 leading-5 resize-none
              focus:outline-none
              placeholder-zinc-600
            "
          />
        </div>
      </div>

      {/* Status bar */}
      {statusMessage && (
        <div className={`text-xs px-2 py-1 rounded ${
          statusMessage.includes('Error') || statusMessage.includes('failed') || statusMessage.includes('Failed')
            ? 'text-red-400 bg-red-900/20'
            : 'text-zinc-400 bg-zinc-800/50'
        }`}>
          {statusMessage}
        </div>
      )}

      {!connected && (
        <p className="text-zinc-600 text-xs">
          Connect to PLC to load and run G-code programs
        </p>
      )}
    </div>
  )
}

function StatusBadge({ label, active, color = 'blue' }: { label: string; active: boolean; color?: string }) {
  const colors = {
    blue: active ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-zinc-800 text-zinc-600 border-zinc-700',
    green: active ? 'bg-green-900/40 text-green-400 border-green-800' : 'bg-zinc-800 text-zinc-600 border-zinc-700',
    red: active ? 'bg-red-900/40 text-red-400 border-red-800' : 'bg-zinc-800 text-zinc-600 border-zinc-700'
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[color]}`}>
      {label}
    </span>
  )
}
