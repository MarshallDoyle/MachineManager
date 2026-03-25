import { useMachineStore } from '../../stores/machineStore'

export function RunNotes() {
  const runNotes = useMachineStore((s) => s.runNotes)
  const setRunNotes = useMachineStore((s) => s.setRunNotes)

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3">
      <h3 className="text-zinc-300 font-semibold text-xs uppercase tracking-wide mb-2">Run Notes</h3>
      <textarea
        value={runNotes}
        onChange={(e) => setRunNotes(e.target.value)}
        placeholder="Material, settings, observations..."
        className="w-full h-20 px-3 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300 placeholder-zinc-600 resize-none focus:outline-none focus:border-blue-500"
      />
    </div>
  )
}
