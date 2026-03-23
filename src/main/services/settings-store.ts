import { app } from 'electron'
import path from 'path'
import fs from 'fs'

interface AppSettings {
  adsConfig: {
    targetAmsNetId: string
    targetAdsPort: number
  }
  windowBounds: {
    x: number
    y: number
    width: number
    height: number
  }
  jogSpeed: 'slow' | 'medium' | 'fast'
}

const DEFAULTS: AppSettings = {
  adsConfig: {
    targetAmsNetId: '127.0.0.1.1.1',
    targetAdsPort: 851
  },
  windowBounds: {
    x: 100,
    y: 100,
    width: 1400,
    height: 900
  },
  jogSpeed: 'medium'
}

class SettingsStore {
  private filePath: string
  private data: AppSettings

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'settings.json')
    this.data = this.load()
  }

  private load(): AppSettings {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8')
        return { ...DEFAULTS, ...JSON.parse(raw) }
      }
    } catch {
      // Ignore corrupt file
    }
    return { ...DEFAULTS }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2))
    } catch {
      // Ignore write errors
    }
  }

  getAdsConfig() { return this.data.adsConfig }
  setAdsConfig(config: AppSettings['adsConfig']) {
    this.data.adsConfig = config
    this.save()
  }

  getWindowBounds() { return this.data.windowBounds }
  setWindowBounds(bounds: AppSettings['windowBounds']) {
    this.data.windowBounds = bounds
    this.save()
  }

  getJogSpeed() { return this.data.jogSpeed }
  setJogSpeed(speed: AppSettings['jogSpeed']) {
    this.data.jogSpeed = speed
    this.save()
  }
}

export const settingsStore = new SettingsStore()
