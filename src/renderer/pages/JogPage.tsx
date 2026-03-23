import { JogPanel } from '../components/jog/JogPanel'
import { AxisStatus } from '../components/status/AxisStatus'

export function JogPage() {
  return (
    <div className="space-y-4 max-w-[900px]">
      <h1 className="text-zinc-300 text-lg font-semibold">Jog Controls</h1>
      <JogPanel />
      <AxisStatus />
    </div>
  )
}
