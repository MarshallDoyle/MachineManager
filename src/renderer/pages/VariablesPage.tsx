import { PlcVariableTable } from '../components/status/PlcVariableTable'

export function VariablesPage() {
  return (
    <div className="space-y-4 max-w-[900px]">
      <h1 className="text-zinc-300 text-lg font-semibold">PLC Variables</h1>
      <PlcVariableTable />
    </div>
  )
}
