import { useState, useCallback } from 'react'
import { useMachineStore } from '../../stores/machineStore'

const INTERP_STATES: Record<number, string> = {
  0: 'Idle', 1: 'Ready', 2: 'Running', 3: 'Waiting',
  4: 'Stopped', 5: 'Done', 12: 'Error'
}

export function GcodeWidget() {
  const connected = useMachineStore((s) => s.connectionStatus === 'connected')
  const programLoaded = useMachineStore((s) => s.programLoaded)
  const programRunning = useMachineStore((s) => s.programRunning)
  const programError = useMachineStore((s) => s.programError)
  const interpreterState = useMachineStore((s) => s.interpreterState)
  const gcodeFileName = useMachineStore((s) => s.gcodeFileName)
  const feedOverride = useMachineStore((s) => s.feedOverride)
  const setFeedOverride = useMachineStore((s) => s.setFeedOverride)
  const setGcodeFileName = useMachineStore((s) => s.setGcodeFileName)

  const [gcodeText, setGcodeText] = useState('')
  const [showEditor, setShowEditor] = useState(false)

  const handleLoad = useCallback(async () => {
    const result = await window.machineAPI.gcode.loadFile()
    if (result) {
      setGcodeFileName(result.fileName)
      setGcodeText(result.content)
      setShowEditor(true)
    }
  }, [setGcodeFileName])

  const handleSaveAndLoad = useCallback(async () => {
    if (!gcodeFileName || !gcodeText) return
    await window.machineAPI.gcode.saveAndLoad(gcodeText, gcodeFileName)
  }, [gcodeFileName, gcodeText])

  const stateLabel = INTERP_STATES[interpreterState] || `State ${interpreterState}`
  const stateColor = programError ? 'text-red-400' : programRunning ? 'text-green-400' : 'text-zinc-400'

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-zinc-300 font-semibold text-xs uppercase tracking-wide">G-Code Program</h3>
        <span className={`text-[10px] font-semibold uppercase ${stateColor}`}>
          {programRunning && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1" />}
          {stateLabel}
        </span>
      </div>

      {/* File info */}
      <div className="flex items-center gap-1 mb-2">
        <span className="text-zinc-500 text-[10px]">File:</span>
        <span className="text-zinc-300 text-xs font-mono truncate flex-1">{gcodeFileName || 'None'}</span>
      </div>

      {/* Control buttons */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        <button onClick={handleLoad} disabled={!connected}
          className="px-1 py-1.5 text-[10px] font-medium rounded bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed">
          Load
        </button>
        <button onClick={() => window.machineAPI.gcode.run()} disabled={!connected || !programLoaded || programRunning}
          className="px-1 py-1.5 text-[10px] font-medium rounded bg-green-700 border border-green-600 text-white hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed">
          Run
        </button>
        <button onClick={() => window.machineAPI.gcode.stop()} disabled={!programRunning}
          className="px-1 py-1.5 text-[10px] font-medium rounded bg-red-700 border border-red-600 text-white hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed">
          Stop
        </button>
        <button onClick={() => window.machineAPI.gcode.reset()} disabled={!connected || programRunning}
          className="px-1 py-1.5 text-[10px] font-medium rounded bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed">
          Reset
        </button>
      </div>

      {/* G-code text editor */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => setShowEditor(!showEditor)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300"
          >
            {showEditor ? '\u25B2 Hide Editor' : '\u25BC Show Editor'}
          </button>
          {showEditor && gcodeText && (
            <button onClick={handleSaveAndLoad} disabled={!connected}
              className="text-[10px] text-blue-400 hover:text-blue-300 disabled:opacity-30">
              Save & Load to PLC
            </button>
          )}
        </div>
        {showEditor && (
          <textarea
            value={gcodeText}
            onChange={(e) => setGcodeText(e.target.value)}
            placeholder="G-code will appear here after loading a file, or type/paste G-code..."
            className="w-full h-40 px-2 py-1.5 text-[11px] font-mono bg-zinc-800 border border-zinc-700 rounded text-zinc-300 placeholder-zinc-600 resize-y focus:outline-none focus:border-blue-500"
            spellCheck={false}
          />
        )}
      </div>

      {/* Feed override */}
      <div>
        <div className="flex justify-between text-[9px] text-zinc-500 mb-0.5">
          <span className="uppercase">Feed Override</span>
          <span className="font-mono">{feedOverride}%</span>
        </div>
        <input
          type="range" min={0} max={200} step={5} value={feedOverride}
          onChange={(e) => setFeedOverride(parseInt(e.target.value))}
          disabled={!connected}
          className="w-full accent-blue-500 h-1.5"
        />
      </div>
    </div>
  )
}
