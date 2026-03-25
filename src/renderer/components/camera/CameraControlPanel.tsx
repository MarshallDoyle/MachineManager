import { useState } from 'react'
import { useMachineStore } from '../../stores/machineStore'
import { PALETTE_OPTIONS, SCALING_OPTIONS, TEMP_RANGE_OPTIONS } from '../../types/machine'

interface CameraControlPanelProps {
  cameraIndex: number
}

export function CameraControlPanel({ cameraIndex }: CameraControlPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const settings = useMachineStore((s) => s.cameraSettings[cameraIndex])
  const setPalette = useMachineStore((s) => s.setCameraPalette)
  const setScaling = useMachineStore((s) => s.setCameraScaling)
  const setManualRange = useMachineStore((s) => s.setCameraManualRange)
  const setEmissivity = useMachineStore((s) => s.setCameraEmissivity)
  const setOverlay = useMachineStore((s) => s.setCameraOverlay)

  if (!settings) return null

  return (
    <div className="border-t border-zinc-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
      >
        <span>Controls</span>
        <span>{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Palette selector */}
          <div>
            <label className="block text-zinc-500 text-[10px] mb-1 uppercase tracking-wide">Palette</label>
            <div className="flex flex-wrap gap-1">
              {PALETTE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPalette(cameraIndex, opt.value)}
                  className={`px-2 py-0.5 text-[10px] rounded border ${
                    settings.palette === opt.value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scaling method */}
          <div>
            <label className="block text-zinc-500 text-[10px] mb-1 uppercase tracking-wide">Scaling</label>
            <div className="flex gap-1">
              {SCALING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setScaling(cameraIndex, opt.value)}
                  className={`px-2 py-0.5 text-[10px] rounded border ${
                    settings.scaling === opt.value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual range inputs (only when scaling = manual) */}
          {settings.scaling === 'manual' && (
            <div className="flex gap-2 items-end">
              <div>
                <label className="block text-zinc-500 text-[10px] mb-0.5">Min (&deg;C)</label>
                <input
                  type="number"
                  value={settings.manualMin}
                  onChange={(e) => setManualRange(cameraIndex, parseFloat(e.target.value) || 0, settings.manualMax)}
                  className="w-20 px-2 py-1 text-xs font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] mb-0.5">Max (&deg;C)</label>
                <input
                  type="number"
                  value={settings.manualMax}
                  onChange={(e) => setManualRange(cameraIndex, settings.manualMin, parseFloat(e.target.value) || 500)}
                  className="w-20 px-2 py-1 text-xs font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Temperature range selection (Ethernet camera) */}
          {cameraIndex === 1 && (
            <div>
              <label className="block text-zinc-500 text-[10px] mb-1 uppercase tracking-wide">Temperature Range</label>
              <div className="flex flex-wrap gap-1">
                {TEMP_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => window.machineAPI?.camera.setTempRange(cameraIndex, opt.min, opt.max)}
                    className="px-2 py-0.5 text-[10px] rounded border bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Radiation parameters row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Emissivity */}
            <div>
              <label className="block text-zinc-500 text-[10px] mb-1 uppercase tracking-wide">
                Emissivity: {settings.emissivity.toFixed(2)}
              </label>
              <input
                type="range"
                min={0.01}
                max={1.0}
                step={0.01}
                value={settings.emissivity}
                onChange={(e) => setEmissivity(cameraIndex, parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-1.5"
              />
            </div>

            {/* Transmissivity */}
            <div>
              <label className="block text-zinc-500 text-[10px] mb-1 uppercase tracking-wide">
                Transmissivity: {settings.transmissivity.toFixed(2)}
              </label>
              <input
                type="range"
                min={0.01}
                max={1.0}
                step={0.01}
                value={settings.transmissivity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  useMachineStore.getState().cameraSettings[cameraIndex].transmissivity = val
                  useMachineStore.setState({ cameraSettings: [...useMachineStore.getState().cameraSettings] })
                  window.machineAPI?.camera.setTransmissivity(cameraIndex, val)
                }}
                className="w-full accent-blue-500 h-1.5"
              />
            </div>
          </div>

          {/* Ambient temperature */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-zinc-500 text-[10px] mb-0.5 uppercase tracking-wide">
                Ambient Temp (&deg;C) <span className="normal-case text-zinc-600">(-100 = auto)</span>
              </label>
              <input
                type="number"
                value={settings.ambientTemp}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || -100
                  useMachineStore.getState().cameraSettings[cameraIndex].ambientTemp = val
                  useMachineStore.setState({ cameraSettings: [...useMachineStore.getState().cameraSettings] })
                  window.machineAPI?.camera.setAmbientTemp(cameraIndex, val)
                }}
                className="w-24 px-2 py-1 text-xs font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Focus motor (Xi 410 only) */}
          {cameraIndex === 1 && settings.focusPosition >= 0 && (
            <div>
              <label className="block text-zinc-500 text-[10px] mb-1 uppercase tracking-wide">
                Focus: {settings.focusPosition.toFixed(0)}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={settings.focusPosition}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  useMachineStore.getState().cameraSettings[cameraIndex].focusPosition = val
                  useMachineStore.setState({ cameraSettings: [...useMachineStore.getState().cameraSettings] })
                  window.machineAPI?.camera.setFocus(cameraIndex, val)
                }}
                className="w-full accent-blue-500 h-1.5"
              />
            </div>
          )}

          {/* Flag controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => window.machineAPI?.camera.forceFlagCycle(cameraIndex)}
              className="px-3 py-1 text-[10px] font-medium rounded bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600"
            >
              Force NUC
            </button>

            <div className="flex items-center gap-1">
              <label className="text-[10px] text-zinc-500">Min:</label>
              <input
                type="number"
                value={settings.flagMinInterval}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 15
                  useMachineStore.getState().cameraSettings[cameraIndex].flagMinInterval = val
                  useMachineStore.setState({ cameraSettings: [...useMachineStore.getState().cameraSettings] })
                  window.machineAPI?.camera.setFlagInterval(cameraIndex, val, settings.flagMaxInterval)
                }}
                className="w-12 px-1 py-0.5 text-[10px] font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-blue-500"
              />
              <label className="text-[10px] text-zinc-500">Max:</label>
              <input
                type="number"
                value={settings.flagMaxInterval}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0
                  useMachineStore.getState().cameraSettings[cameraIndex].flagMaxInterval = val
                  useMachineStore.setState({ cameraSettings: [...useMachineStore.getState().cameraSettings] })
                  window.machineAPI?.camera.setFlagInterval(cameraIndex, settings.flagMinInterval, val)
                }}
                className="w-12 px-1 py-0.5 text-[10px] font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-zinc-600">sec</span>
            </div>
          </div>

          {/* Overlay toggles */}
          <div className="flex gap-3">
            <label className="flex items-center gap-1 text-[10px] text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showOverlay}
                onChange={(e) => setOverlay(cameraIndex, 'showOverlay', e.target.checked)}
                className="accent-blue-500"
              />
              Temps
            </label>
            <label className="flex items-center gap-1 text-[10px] text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showColorBar}
                onChange={(e) => setOverlay(cameraIndex, 'showColorBar', e.target.checked)}
                className="accent-blue-500"
              />
              Color Bar
            </label>
            <label className="flex items-center gap-1 text-[10px] text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showCrosshairs}
                onChange={(e) => setOverlay(cameraIndex, 'showCrosshairs', e.target.checked)}
                className="accent-blue-500"
              />
              Crosshairs
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
