import { contextBridge, ipcRenderer } from 'electron'

const machineAPI = {
  ads: {
    connect: (config: { targetAmsNetId: string; targetAdsPort: number }) =>
      ipcRenderer.invoke('ads:connect', config),
    disconnect: () =>
      ipcRenderer.invoke('ads:disconnect'),
    readSymbol: (path: string) =>
      ipcRenderer.invoke('ads:read-symbol', path),
    writeSymbol: (path: string, value: unknown) =>
      ipcRenderer.invoke('ads:write-symbol', path, value),
    startJog: (axis: string, direction: string) =>
      ipcRenderer.invoke('ads:start-jog', axis, direction),
    stopJog: (axis: string, direction: string) =>
      ipcRenderer.invoke('ads:stop-jog', axis, direction),
    stopAll: () =>
      ipcRenderer.invoke('ads:stop-all'),
    setJogVelocity: (velocity: number) =>
      ipcRenderer.invoke('ads:set-jog-velocity', velocity),
    setJogMode: (mode: number) =>
      ipcRenderer.invoke('ads:set-jog-mode', mode),
    setJogDistance: (distanceMm: number) =>
      ipcRenderer.invoke('ads:set-jog-distance', distanceMm),
    isConnected: () =>
      ipcRenderer.invoke('ads:is-connected'),
    diagnose: () =>
      ipcRenderer.invoke('ads:diagnose'),
    // System commands
    enableSystem: (enable: boolean) =>
      ipcRenderer.invoke('ads:enable-system', enable),
    homeSystem: () =>
      ipcRenderer.invoke('ads:home-system'),
    resetError: () =>
      ipcRenderer.invoke('ads:reset-error'),
    startToolMeasure: () =>
      ipcRenderer.invoke('ads:start-tool-measure'),
    // Feed override
    setFeedOverride: (percent: number) =>
      ipcRenderer.invoke('ads:set-feed-override', percent),
    // Listeners
    onSymbolUpdate: (callback: (data: Record<string, unknown>) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: Record<string, unknown>) => callback(data)
      ipcRenderer.on('ads:symbol-update', listener)
      return () => ipcRenderer.removeListener('ads:symbol-update', listener)
    },
    onConnectionChange: (callback: (connected: boolean, detail?: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, connected: boolean, detail?: string) => callback(connected, detail)
      ipcRenderer.on('ads:connection-change', listener)
      return () => ipcRenderer.removeListener('ads:connection-change', listener)
    }
  },
  camera: {
    start: () => ipcRenderer.invoke('camera:start'),
    stop: () => ipcRenderer.invoke('camera:stop'),
    status: () => ipcRenderer.invoke('camera:status'),
    onStatusChange: (callback: (status: { running: boolean; error: string | null }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: { running: boolean; error: string | null }) =>
        callback(status)
      ipcRenderer.on('camera:status-change', listener)
      return () => ipcRenderer.removeListener('camera:status-change', listener)
    },
    setPalette: (camera: number, palette: string) =>
      ipcRenderer.invoke('camera:set-palette', camera, palette),
    setScaling: (camera: number, scaling: string) =>
      ipcRenderer.invoke('camera:set-scaling', camera, scaling),
    setManualRange: (camera: number, min: number, max: number) =>
      ipcRenderer.invoke('camera:set-manual-range', camera, min, max),
    setEmissivity: (camera: number, value: number) =>
      ipcRenderer.invoke('camera:set-emissivity', camera, value),
    forceFlagCycle: (camera: number) =>
      ipcRenderer.invoke('camera:force-flag-cycle', camera)
  },
  gcode: {
    loadFile: () => ipcRenderer.invoke('gcode:load-file'),
    saveAndLoad: (gcodeText: string, fileName: string, nciDir?: string) =>
      ipcRenderer.invoke('gcode:save-and-load', gcodeText, fileName, nciDir),
    run: () => ipcRenderer.invoke('gcode:run'),
    stop: () => ipcRenderer.invoke('gcode:stop'),
    reset: () => ipcRenderer.invoke('gcode:reset')
  },
  settings: {
    getAdsConfig: () => ipcRenderer.invoke('settings:get-ads-config'),
    setAdsConfig: (config: { targetAmsNetId: string; targetAdsPort: number }) =>
      ipcRenderer.invoke('settings:set-ads-config', config),
    getJogSpeed: () => ipcRenderer.invoke('settings:get-jog-speed'),
    setJogSpeed: (speed: string) => ipcRenderer.invoke('settings:set-jog-speed', speed)
  }
}

contextBridge.exposeInMainWorld('machineAPI', machineAPI)

export type MachineAPI = typeof machineAPI
