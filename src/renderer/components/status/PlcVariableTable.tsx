import { useState, useCallback } from 'react'

interface PlcVariable {
  path: string
  value: string
  error: string | null
}

export function PlcVariableTable() {
  const [variables, setVariables] = useState<PlcVariable[]>([])
  const [readPath, setReadPath] = useState('')
  const [loading, setLoading] = useState(false)

  const readVariable = useCallback(async () => {
    if (!readPath.trim()) return
    setLoading(true)
    const result = await window.machineAPI.ads.readSymbol(readPath.trim())
    setVariables((prev) => {
      const existing = prev.findIndex((v) => v.path === readPath.trim())
      const entry: PlcVariable = {
        path: readPath.trim(),
        value: result.success ? JSON.stringify(result.value) : '',
        error: result.success ? null : result.error
      }
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = entry
        return updated
      }
      return [...prev, entry]
    })
    setLoading(false)
  }, [readPath])

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
      <h2 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide mb-3">PLC Variables</h2>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={readPath}
          onChange={(e) => setReadPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && readVariable()}
          placeholder="GVL_MachineManager.bPlcReady"
          className="
            flex-1 px-3 py-1.5 text-sm font-mono
            bg-zinc-800 border border-zinc-600 rounded-md
            text-zinc-200 placeholder-zinc-600
            focus:outline-none focus:border-blue-500
          "
        />
        <button
          onClick={readVariable}
          disabled={loading}
          className="
            px-4 py-1.5 text-xs font-medium rounded-md
            bg-zinc-700 border border-zinc-600 text-zinc-300
            hover:bg-zinc-600 disabled:opacity-50
          "
        >
          Read
        </button>
      </div>

      {variables.length > 0 && (
        <div className="border border-zinc-700 rounded-md overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-zinc-800 text-zinc-500">
                <th className="text-left px-3 py-1.5">Variable</th>
                <th className="text-left px-3 py-1.5">Value</th>
              </tr>
            </thead>
            <tbody>
              {variables.map((v) => (
                <tr key={v.path} className="border-t border-zinc-800">
                  <td className="px-3 py-1.5 text-zinc-400">{v.path}</td>
                  <td className={`px-3 py-1.5 ${v.error ? 'text-red-400' : 'text-green-400'}`}>
                    {v.error ?? v.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
