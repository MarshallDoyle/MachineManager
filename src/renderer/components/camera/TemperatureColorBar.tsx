import type { ThermalPalette } from '../../types/machine'
import { PALETTE_GRADIENTS } from '../../types/machine'

interface TemperatureColorBarProps {
  scaleMin: number
  scaleMax: number
  mean: number
  palette: ThermalPalette
}

export function TemperatureColorBar({ scaleMin, scaleMax, mean, palette }: TemperatureColorBarProps) {
  const gradient = PALETTE_GRADIENTS[palette] || PALETTE_GRADIENTS.iron

  return (
    <div className="flex flex-col items-center justify-between py-2 px-1 w-10 shrink-0">
      <span className="text-[9px] font-mono text-zinc-400 leading-none">{scaleMax.toFixed(0)}</span>
      <div
        className="flex-1 w-4 rounded-sm my-1 border border-zinc-700"
        style={{ background: gradient }}
      />
      <span className="text-[9px] font-mono text-zinc-400 leading-none">{scaleMin.toFixed(0)}</span>
    </div>
  )
}
