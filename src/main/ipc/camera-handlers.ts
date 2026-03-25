import { ipcMain, BrowserWindow } from 'electron'
import { cameraBridgeService } from '../services/camera-bridge'

export function registerCameraHandlers(mainWindow: BrowserWindow): void {
  cameraBridgeService.setStatusCallback((status) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('camera:status-change', status)
    }
  })

  ipcMain.handle('camera:start', async () => {
    try {
      const status = await cameraBridgeService.start()
      return { success: true, ...status }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('camera:stop', async () => {
    try {
      await cameraBridgeService.stop()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('camera:status', () => {
    return cameraBridgeService.getStatus()
  })

  ipcMain.handle('camera:set-palette', (_e, camera: number, palette: string) => {
    cameraBridgeService.sendCommand({ cmd: 'setPalette', camera, value: palette })
  })

  ipcMain.handle('camera:set-scaling', (_e, camera: number, scaling: string) => {
    cameraBridgeService.sendCommand({ cmd: 'setScaling', camera, value: scaling })
  })

  ipcMain.handle('camera:set-manual-range', (_e, camera: number, min: number, max: number) => {
    cameraBridgeService.sendCommand({ cmd: 'setManualRange', camera, min, max })
  })

  ipcMain.handle('camera:set-emissivity', (_e, camera: number, value: number) => {
    cameraBridgeService.sendCommand({ cmd: 'setEmissivity', camera, value })
  })

  ipcMain.handle('camera:force-flag-cycle', (_e, camera: number) => {
    cameraBridgeService.sendCommand({ cmd: 'forceFlagCycle', camera })
  })

  ipcMain.handle('camera:set-focus', (_e, camera: number, value: number) => {
    cameraBridgeService.sendCommand({ cmd: 'setFocus', camera, value })
  })

  ipcMain.handle('camera:set-transmissivity', (_e, camera: number, value: number) => {
    cameraBridgeService.sendCommand({ cmd: 'setTransmissivity', camera, value })
  })

  ipcMain.handle('camera:set-ambient-temp', (_e, camera: number, value: number) => {
    cameraBridgeService.sendCommand({ cmd: 'setAmbientTemp', camera, value })
  })

  ipcMain.handle('camera:set-temp-range', (_e, camera: number, min: number, max: number) => {
    cameraBridgeService.sendCommand({ cmd: 'setTempRange', camera, min, max })
  })

  ipcMain.handle('camera:set-flag-interval', (_e, camera: number, min: number, max: number) => {
    cameraBridgeService.sendCommand({ cmd: 'setFlagInterval', camera, min, max })
  })

  ipcMain.handle('camera:get-device-temps', (_e, camera: number) => {
    cameraBridgeService.sendCommand({ cmd: 'getDeviceTemps', camera })
  })
}
