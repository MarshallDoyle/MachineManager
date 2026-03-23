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
      // Connection failed entirely — try to diagnose why
      let errorMsg = String(err)
      try {
        const diagnosis = await adsService.diagnoseConnection()
        errorMsg = diagnosis.message
      } catch {
        // Can't diagnose, use original error
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
}
