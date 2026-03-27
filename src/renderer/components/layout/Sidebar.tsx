interface SidebarProps {
  activePage: string
  onNavigate: (page: string) => void
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '\u25A6' },
  { id: 'jog', label: 'Jog', icon: '\u2725' },
  { id: 'gcode', label: 'G-Code', icon: '\u25B6' },
  { id: 'ambrell', label: 'Heater', icon: '\u2668' },
  { id: 'bed', label: 'Bed', icon: '\u2B1A' },
  { id: 'scan', label: 'Scan', icon: '\u25CE' },
  { id: 'analysis', label: 'Analysis', icon: '\u25B7' },
  { id: 'variables', label: 'Variables', icon: '\u2630' },
  { id: 'settings', label: 'Settings', icon: '\u2699' }
]

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <div className="w-16 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center py-4 gap-1">
      {/* Logo / App icon */}
      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm mb-6">
        MM
      </div>

      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          title={item.label}
          className={`
            w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-colors text-xs
            ${activePage === item.id
              ? 'bg-zinc-800 text-blue-400'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}
          `}
        >
          <span className="text-lg">{item.icon}</span>
          <span className="text-[10px]">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
