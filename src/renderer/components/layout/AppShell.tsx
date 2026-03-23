import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { DashboardPage } from '../../pages/DashboardPage'
import { JogPage } from '../../pages/JogPage'
import { VariablesPage } from '../../pages/VariablesPage'
import { SettingsPage } from '../../pages/SettingsPage'
import { GcodePage } from '../../pages/GcodePage'
import { BuildPlateScanPage } from '../../pages/BuildPlateScanPage'
import { AnalysisPage } from '../../pages/AnalysisPage'

export function AppShell() {
  const [activePage, setActivePage] = useState('dashboard')

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />
      case 'jog':
        return <JogPage />
      case 'gcode':
        return <GcodePage />
      case 'scan':
        return <BuildPlateScanPage />
      case 'analysis':
        return <AnalysisPage />
      case 'variables':
        return <VariablesPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-200">
      {/* Title bar area */}
      <div className="h-10 bg-zinc-950 border-b border-zinc-800 flex items-center px-4 drag-region">
        <span className="text-sm font-semibold text-zinc-400">Machine Manager</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <main className="flex-1 overflow-y-auto p-4">
          {renderPage()}
        </main>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}
