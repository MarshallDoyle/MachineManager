interface GcodeViewerProps {
  code: string
}

export function GcodeViewer({ code }: GcodeViewerProps) {
  const lines = code.split('\n')

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden flex flex-col">
      <div className="px-3 py-1.5 border-b border-zinc-700">
        <h3 className="text-zinc-300 font-semibold text-xs">G-Code Program</h3>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[11px] max-h-[300px]">
        {lines.length > 0 && lines[0] ? (
          <table className="w-full">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-zinc-800/50">
                  <td className="text-right pr-3 pl-2 py-0 text-zinc-600 select-none w-10 border-r border-zinc-800">
                    {i + 1}
                  </td>
                  <td className="pl-3 pr-2 py-0 text-zinc-400 whitespace-pre">
                    {line}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-zinc-600 text-xs">No G-code in this recording</div>
        )}
      </div>
    </div>
  )
}
