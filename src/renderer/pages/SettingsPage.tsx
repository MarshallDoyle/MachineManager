import { useState } from 'react'
import { useMachineStore } from '../stores/machineStore'

export function SettingsPage() {
  const adsConfig = useMachineStore((s) => s.adsConfig)
  const setAdsConfig = useMachineStore((s) => s.setAdsConfig)

  const [amsNetId, setAmsNetId] = useState(adsConfig.targetAmsNetId)
  const [adsPort, setAdsPort] = useState(String(adsConfig.targetAdsPort))
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<Array<{ step: string; status: string; detail: string }> | null>(null)

  const handleSave = () => {
    const config = {
      targetAmsNetId: amsNetId,
      targetAdsPort: parseInt(adsPort, 10) || 851
    }
    setAdsConfig(config)
    window.machineAPI.settings.setAdsConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-[600px]">
      <h1 className="text-zinc-300 text-lg font-semibold">Settings</h1>

      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-4">
        <h2 className="text-zinc-400 text-sm font-semibold uppercase tracking-wide">ADS Connection</h2>

        <div>
          <label className="block text-zinc-500 text-xs mb-1">AMS Net ID</label>
          <input
            type="text"
            value={amsNetId}
            onChange={(e) => setAmsNetId(e.target.value)}
            placeholder="127.0.0.1.1.1"
            className="
              w-full px-3 py-2 text-sm font-mono
              bg-zinc-800 border border-zinc-600 rounded-md
              text-zinc-200 placeholder-zinc-600
              focus:outline-none focus:border-blue-500
            "
          />
        </div>

        <div>
          <label className="block text-zinc-500 text-xs mb-1">ADS Port</label>
          <input
            type="text"
            value={adsPort}
            onChange={(e) => setAdsPort(e.target.value)}
            placeholder="851"
            className="
              w-full px-3 py-2 text-sm font-mono
              bg-zinc-800 border border-zinc-600 rounded-md
              text-zinc-200 placeholder-zinc-600
              focus:outline-none focus:border-blue-500
            "
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500"
          >
            Save Settings
          </button>
          <button
            onClick={async () => {
              setTesting(true)
              setTestResults(null)
              try {
                const config = { targetAmsNetId: amsNetId, targetAdsPort: parseInt(adsPort, 10) || 851 }
                const result = await window.machineAPI.ads.testConnection(config)
                setTestResults(result.steps)
              } catch (err) {
                setTestResults([{ step: 'Connection', status: 'fail', detail: String(err) }])
              }
              setTesting(false)
            }}
            disabled={testing}
            className="px-4 py-2 text-sm font-medium rounded-md bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600 disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {saved && <span className="text-green-400 text-xs">Saved</span>}
        </div>

        {/* Test results */}
        {testResults && (
          <div className="mt-3 space-y-1.5">
            {testResults.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={`mt-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold ${
                  r.status === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {r.status === 'ok' ? '\u2713' : '\u2717'}
                </span>
                <div>
                  <span className="text-zinc-300 font-medium">{r.step}</span>
                  <span className="text-zinc-500 ml-2">{r.detail}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-2">
        <h2 className="text-zinc-400 text-sm font-semibold uppercase tracking-wide">Camera Bridge</h2>
        <p className="text-zinc-500 text-xs">
          The camera bridge connects to your Optris thermal cameras and streams frames to this application.
          Meltpool camera (PI 1M) streams on ws://localhost:9801, build plate camera on ws://localhost:9802.
        </p>
        <p className="text-zinc-600 text-xs">
          Ensure the Optris OTC SDK is installed and cameras are connected via USB before starting.
        </p>
      </div>
    </div>
  )
}
