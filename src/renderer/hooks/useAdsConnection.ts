import { useEffect, useState } from 'react'
import { useMachineStore } from '../stores/machineStore'

export function useAdsConnection() {
  const connectionStatus = useMachineStore((s) => s.connectionStatus)
  const setConnectionStatus = useMachineStore((s) => s.setConnectionStatus)
  const updateAxisData = useMachineStore((s) => s.updateAxisData)
  const adsConfig = useMachineStore((s) => s.adsConfig)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    // Listen for connection changes from main process
    const unsubConnection = window.machineAPI.ads.onConnectionChange((connected, detail) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected')
      if (connected) {
        setConnectionError(null)
      } else if (detail) {
        setConnectionError(detail)
      }
    })

    // Listen for real-time symbol updates
    const unsubSymbol = window.machineAPI.ads.onSymbolUpdate((data) => {
      updateAxisData(data)
    })

    // Auto-connect to PLC on startup
    window.machineAPI.ads.isConnected().then((connected) => {
      if (!connected) {
        console.log('[ADS] Auto-connecting to', adsConfig.targetAmsNetId)
        setConnectionStatus('connecting')
        window.machineAPI.ads.connect(adsConfig).then((result) => {
          if (!result.success) {
            setConnectionStatus('error')
            setConnectionError(result.error ?? 'Auto-connect failed')
          }
        })
      }
    })

    return () => {
      unsubConnection()
      unsubSymbol()
    }
  }, [setConnectionStatus, updateAxisData, adsConfig])

  const connect = async () => {
    setConnectionStatus('connecting')
    setConnectionError(null)
    const result = await window.machineAPI.ads.connect(adsConfig)
    if (!result.success) {
      setConnectionStatus('error')
      setConnectionError(result.error ?? 'Unknown connection error')
    }
  }

  const disconnect = async () => {
    await window.machineAPI.ads.disconnect()
    setConnectionStatus('disconnected')
    setConnectionError(null)
  }

  const diagnose = async () => {
    const result = await window.machineAPI.ads.diagnose()
    setConnectionError(result.message)
    return result
  }

  return { connectionStatus, connectionError, connect, disconnect, diagnose }
}
