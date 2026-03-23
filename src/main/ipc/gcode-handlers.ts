import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { adsService } from '../services/ads-client'

// Default NCI working directory on local TwinCAT runtime
// TwinCAT NCI typically loads files from the boot project directory
const DEFAULT_NCI_DIR = 'C:\\TwinCAT\\3.1\\Boot\\Nci'

export function registerGcodeHandlers(mainWindow: BrowserWindow): void {
  // Open file dialog and read G-code file
  ipcMain.handle('gcode:load-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Load G-Code File',
      filters: [
        { name: 'G-Code Files', extensions: ['gcode', 'nc', 'ngc', 'tap', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    const content = fs.readFileSync(filePath, 'utf-8')
    const fileName = path.basename(filePath)

    return { fileName, content, filePath }
  })

  // Save G-code to NCI directory and load on PLC
  ipcMain.handle('gcode:save-and-load', async (_event, gcodeText: string, fileName: string, nciDir?: string) => {
    try {
      const targetDir = nciDir || DEFAULT_NCI_DIR

      // Ensure the NCI directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      // Write the G-code file to the NCI directory
      const targetPath = path.join(targetDir, fileName)
      fs.writeFileSync(targetPath, gcodeText, 'utf-8')

      // Set the filename on the PLC
      await adsService.setGCodeFileName(fileName)

      // Trigger NCI load
      await adsService.loadFile()

      return { success: true, savedPath: targetPath }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Run the G-code program (NCI start)
  ipcMain.handle('gcode:run', async () => {
    try {
      await adsService.runFile()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Stop the G-code program (NCI stop)
  ipcMain.handle('gcode:stop', async () => {
    try {
      await adsService.stopFile()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Reset NCI interpreter
  ipcMain.handle('gcode:reset', async () => {
    try {
      await adsService.resetInterpreter()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
