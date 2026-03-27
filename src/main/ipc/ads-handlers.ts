import { ipcMain, BrowserWindow } from 'electron'
import { adsService } from '../services/ads-client'

export function registerAdsHandlers(mainWindow: BrowserWindow): void {
  // Forward connection status events from ADS service to renderer
  adsService.setConnectionStatusHandler((status, detail) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ads:connection-change', status === 'connected', detail)
    }
  })

  ipcMain.handle('ads:connect', async (_event, config: { targetAmsNetId: string; targetAdsPort: number }) => {
    try {
      await adsService.connect(config)

      // Diagnose to see if PLC is actually ready
      const diagnosis = await adsService.diagnoseConnection()
      console.log('ADS diagnosis:', diagnosis.status, '-', diagnosis.message)

      if (diagnosis.status !== 'connected') {
        // Connected to TwinCAT but PLC not fully ready
        mainWindow.webContents.send('ads:connection-change', false, diagnosis.message)
        return { success: false, error: diagnosis.message }
      }

      // PLC is ready — subscribe to symbols
      try {
        await adsService.subscribeToAxes((data) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ads:symbol-update', data)
          }
        })
        console.log('ADS subscriptions established')
      } catch (subErr) {
        console.warn('ADS subscriptions failed:', subErr)
        mainWindow.webContents.send('ads:connection-change', false, 'Subscriptions failed: ' + String(subErr))
        return { success: false, error: 'Connected but failed to subscribe to PLC symbols' }
      }

      // Start heartbeat to keep PLC watchdog happy
      adsService.startHeartbeat()
      console.log('ADS heartbeat started')

      mainWindow.webContents.send('ads:connection-change', true)
      return { success: true }
    } catch (err) {
      // Connection failed entirely — provide actionable error message
      const rawError = String(err)
      console.error('ADS connection failed:', rawError)

      let errorMsg: string
      if (rawError.includes('ECONNREFUSED')) {
        errorMsg = `Cannot reach PLC at ${config.targetAmsNetId}:${config.targetAdsPort}. Check that the CX5340 is powered on, TwinCAT is running, and the network cable is connected.`
      } else if (rawError.includes('ETIMEDOUT') || rawError.includes('timeout')) {
        errorMsg = `Connection timed out reaching ${config.targetAmsNetId}. Verify the AMS NetId is correct and the CX5340 is on the same network.`
      } else if (rawError.includes('AmsNetId')) {
        errorMsg = `Invalid AMS NetId format: ${config.targetAmsNetId}. Expected format: x.x.x.x.x.x (e.g., 10.1.180.201.1.1)`
      } else {
        errorMsg = `Connection failed: ${rawError}`
      }

      // Try diagnosis as a fallback
      try {
        const diagnosis = await adsService.diagnoseConnection()
        if (diagnosis.message) errorMsg = diagnosis.message
      } catch {
        // Can't diagnose without connection, use the friendly error
      }

      mainWindow.webContents.send('ads:connection-change', false, errorMsg)
      return { success: false, error: errorMsg }
    }
  })

  ipcMain.handle('ads:disconnect', async () => {
    try {
      await adsService.disconnect()
      mainWindow.webContents.send('ads:connection-change', false)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:diagnose', async () => {
    try {
      return await adsService.diagnoseConnection()
    } catch (err) {
      return { status: 'error', message: String(err) }
    }
  })

  ipcMain.handle('ads:read-symbol', async (_event, path: string) => {
    try {
      const value = await adsService.readSymbol(path)
      return { success: true, value }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:write-symbol', async (_event, path: string, value: unknown) => {
    try {
      await adsService.writeSymbol(path, value)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // --- Jog ---

  ipcMain.handle('ads:start-jog', async (_event, axis: string, direction: string) => {
    try {
      await adsService.startJog(axis, direction)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:stop-jog', async (_event, axis: string, direction: string) => {
    try {
      await adsService.stopJog(axis, direction)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:stop-all', async () => {
    try {
      await adsService.stopAll()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:set-jog-velocity', async (_event, velocity: number) => {
    try {
      await adsService.setJogVelocity(velocity)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:set-jog-mode', async (_event, mode: number) => {
    try {
      await adsService.setJogMode(mode)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:set-jog-distance', async (_event, distanceMm: number) => {
    try {
      await adsService.setJogDistance(distanceMm)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // --- System commands ---

  ipcMain.handle('ads:enable-system', async (_event, enable: boolean) => {
    try {
      await adsService.enableSystem(enable)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:home-system', async () => {
    try {
      await adsService.homeSystem()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:reset-error', async () => {
    try {
      await adsService.resetError()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:start-tool-measure', async () => {
    try {
      await adsService.startToolMeasure()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // --- G-code ---

  ipcMain.handle('ads:set-feed-override', async (_event, percent: number) => {
    try {
      await adsService.setFeedOverride(percent)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:set-gcode-filename', async (_event, fileName: string) => {
    try {
      await adsService.setGCodeFileName(fileName)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:load-file', async () => {
    try {
      await adsService.loadFile()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:run-file', async () => {
    try {
      await adsService.runFile()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:stop-file', async () => {
    try {
      await adsService.stopFile()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:reset-interpreter', async () => {
    try {
      await adsService.resetInterpreter()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ads:is-connected', () => {
    return adsService.isConnected()
  })

  ipcMain.handle('ads:test-connection', async (_event, config: { targetAmsNetId: string; targetAdsPort: number }) => {
    const steps: Array<{ step: string; status: 'ok' | 'fail' | 'skip'; detail: string }> = []

    try {
      // Step 1: Try to connect
      console.log(`[ADS Test] Connecting to ${config.targetAmsNetId}:${config.targetAdsPort}...`)
      await adsService.connect(config)
      steps.push({ step: 'Network Connection', status: 'ok', detail: `Reached ${config.targetAmsNetId}` })
    } catch (err) {
      const e = String(err)
      if (e.includes('ECONNREFUSED')) {
        steps.push({ step: 'Network Connection', status: 'fail', detail: `Connection refused at ${config.targetAmsNetId}:${config.targetAdsPort}. Is TwinCAT running?` })
      } else if (e.includes('ETIMEDOUT') || e.includes('timeout')) {
        steps.push({ step: 'Network Connection', status: 'fail', detail: `Timed out reaching ${config.targetAmsNetId}. Check network and AMS NetId.` })
      } else {
        steps.push({ step: 'Network Connection', status: 'fail', detail: e })
      }
      return { steps }
    }

    try {
      // Step 2: TwinCAT system state
      const diagnosis = await adsService.diagnoseConnection()
      if (diagnosis.status === 'tc_config_mode') {
        steps.push({ step: 'TwinCAT Runtime', status: 'fail', detail: 'TwinCAT is in Config mode. Activate and switch to Run mode.' })
        await adsService.disconnect()
        return { steps }
      }
      steps.push({ step: 'TwinCAT Runtime', status: 'ok', detail: 'TwinCAT is in Run mode' })

      if (diagnosis.status === 'plc_not_running') {
        steps.push({ step: 'PLC Runtime', status: 'fail', detail: 'PLC is stopped. Start the PLC in TwinCAT XAE.' })
        await adsService.disconnect()
        return { steps }
      }
      steps.push({ step: 'PLC Runtime', status: 'ok', detail: 'PLC is running on port 851' })

      if (diagnosis.status === 'symbols_not_found') {
        steps.push({ step: 'PLC Symbols', status: 'fail', detail: 'GVL_MachineManager not found. Compile and download the PLC program.' })
        await adsService.disconnect()
        return { steps }
      }
      steps.push({ step: 'PLC Symbols', status: 'ok', detail: 'GVL_MachineManager symbols accessible' })
    } catch (err) {
      steps.push({ step: 'Diagnosis', status: 'fail', detail: String(err) })
    }

    // Disconnect test connection (don't leave it open)
    try { await adsService.disconnect() } catch { /* ignore */ }

    return { steps }
  })
}
