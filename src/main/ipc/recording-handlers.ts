import { ipcMain, BrowserWindow } from 'electron'
import { recordingService } from '../services/recording-service'

export function registerRecordingHandlers(mainWindow: BrowserWindow): void {
  recordingService.setStatusCallback((status) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('recording:status-change', status)
    }
  })

  ipcMain.handle('recording:start', async (_e, fileName: string) => {
    try {
      const status = await recordingService.start(fileName)
      return { success: true, ...status }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('recording:stop', async () => {
    try {
      const status = await recordingService.stop()
      return { success: true, ...status }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('recording:status', () => {
    return recordingService.getStatus()
  })

  ipcMain.handle('recording:list', async () => {
    return recordingService.listRecordings()
  })

  ipcMain.handle('recording:load', async (_e, recordingId: string) => {
    try {
      return await recordingService.loadRecording(recordingId)
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('recording:read-frame', (_e, recordingId: string, camera: string, frameIndex: number) => {
    const frame = recordingService.readFrame(recordingId, camera, frameIndex)
    return frame // Returns Buffer or null
  })
}
