import { useState } from 'react'
import { useMachineStore } from '../../stores/machineStore'
import { PALETTE_OPTIONS, SCALING_OPTIONS } from '../../types/machine'
import type { ThermalPalette, ScalingMethod } from '../../types/machine'

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
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    setManualRange(cameraIndex, val, settings.manualMax)
                  }}
                  className="w-20 px-2 py-1 text-xs font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] mb-0.5">Max (&deg;C)</label>
                <input
                  type="number"
                  value={settings.manualMax}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 500
                    setManualRange(cameraIndex, settings.manualMin, val)
                  }}
                  className="w-20 px-2 py-1 text-xs font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Emissivity slider (USB camera only) */}
          {cameraIndex === 0 && (
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
          )}

          {/* Force NUC (USB camera only) */}
          {cameraIndex === 0 && (
            <button
              onClick={() => window.machineAPI?.camera.forceFlagCycle(cameraIndex)}
              className="px-3 py-1 text-[10px] font-medium rounded bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600"
            >
              Force NUC (Flag Cycle)
            </button>
          )}

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
