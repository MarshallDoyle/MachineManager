import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { registerAdsHandlers } from './ipc/ads-handlers'
import { registerCameraHandlers } from './ipc/camera-handlers'
import { registerGcodeHandlers } from './ipc/gcode-handlers'
import { settingsStore } from './services/settings-store'
import { adsService } from './services/ads-client'
import { cameraBridgeService } from './services/camera-bridge'

function createWindow(): BrowserWindow {
  const bounds = settingsStore.getWindowBounds()

  const mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 1024,
    minHeight: 700,
    title: 'Machine Manager',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Save window position/size on close
  mainWindow.on('close', () => {
    const currentBounds = mainWindow.getBounds()
    settingsStore.setWindowBounds(currentBounds)
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Register IPC handlers
  registerAdsHandlers(mainWindow)
  registerCameraHandlers(mainWindow)
  registerGcodeHandlers(mainWindow)

  // Settings handlers
  ipcMain.handle('settings:get-ads-config', () => settingsStore.getAdsConfig())
  ipcMain.handle('settings:set-ads-config', (_e, config) => settingsStore.setAdsConfig(config))
  ipcMain.handle('settings:get-jog-speed', () => settingsStore.getJogSpeed())
  ipcMain.handle('settings:set-jog-speed', (_e, speed) => settingsStore.setJogSpeed(speed))

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', async () => {
  // Clean up services before quitting
  try {
    await adsService.disconnect()
  } catch {
    // Ignore
  }
  try {
    await cameraBridgeService.stop()
  } catch {
    // Ignore
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})
