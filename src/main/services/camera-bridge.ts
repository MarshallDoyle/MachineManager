import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { app } from 'electron'

export interface CameraBridgeStatus {
  running: boolean
  meltpoolUrl: string
  buildPlateUrl: string
  error: string | null
}

class CameraBridgeService {
  private process: ChildProcess | null = null
  private status: CameraBridgeStatus = {
    running: false,
    meltpoolUrl: 'ws://localhost:9801',
    buildPlateUrl: 'ws://localhost:9802',
    error: null
  }
  private onStatusChange: ((status: CameraBridgeStatus) => void) | null = null
  private restartCount = 0
  private readonly maxRestarts = 3
  private stoppedByUser = false

  setStatusCallback(callback: (status: CameraBridgeStatus) => void): void {
    this.onStatusChange = callback
  }

  async start(): Promise<CameraBridgeStatus> {
    if (this.process) {
      return this.status
    }

    const bridgePath = this.getBridgePath()
    this.restartCount = 0
    this.stoppedByUser = false

    try {
      this.spawnBridge(bridgePath)
      this.status.running = true
      this.status.error = null
      this.notifyStatus()
      return this.status
    } catch (err) {
      this.status.running = false
      this.status.error = `Failed to start camera bridge: ${err}`
      this.notifyStatus()
      throw err
    }
  }

  async stop(): Promise<void> {
    this.stoppedByUser = true
    if (this.process) {
      this.process.kill()
      this.process = null
    }
    this.status.running = false
    this.status.error = null
    this.notifyStatus()
  }

  getStatus(): CameraBridgeStatus {
    return { ...this.status }
  }

  sendCommand(cmd: Record<string, unknown>): void {
    if (this.process?.stdin?.writable) {
      this.process.stdin.write(JSON.stringify(cmd) + '\n')
    }
  }

  private getBridgePath(): string {
    if (app.isPackaged) {
      // In production, the bridge exe is in resources/camera-bridge/
      return path.join(process.resourcesPath, 'camera-bridge', 'camera-bridge.exe')
    }
    // In dev, use the compiled C++ bridge
    return path.join(app.getAppPath(), 'camera-bridge-cpp', 'build', 'bin', 'camera-bridge.exe')
  }

  private getBridgeArgs(): string[] {
    const configDir = app.isPackaged
      ? path.join(process.resourcesPath, 'camera-bridge')
      : path.join(app.getAppPath(), 'camera-bridge')

    return [
      '--wait',
      path.join(configDir, 'cam1_meltpool.xml'),
      path.join(configDir, 'cam2_buildplate.xml')
    ]
  }

  private spawnBridge(bridgePath: string): void {
    const args = this.getBridgeArgs()

    this.process = spawn(bridgePath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    })

    this.process.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim()
      console.log(`[Camera Bridge] ${msg}`)
      // Detect when bridge is actually streaming
      if (msg.includes('Streaming...') || msg.includes('Capture loop started')) {
        this.status.running = true
        this.status.error = null
        this.notifyStatus()
      }
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      console.error(`[Camera Bridge Error] ${data.toString().trim()}`)
    })

    this.process.on('exit', (code) => {
      console.log(`Camera bridge exited with code ${code}`)
      this.process = null
      this.status.running = false

      if (code !== 0 && !this.stoppedByUser && this.restartCount < this.maxRestarts) {
        this.restartCount++
        this.status.error = `Bridge crashed (restart ${this.restartCount}/${this.maxRestarts})`
        this.notifyStatus()
        // Auto-restart with backoff
        const delay = Math.pow(2, this.restartCount) * 1000
        setTimeout(() => {
          try {
            this.spawnBridge(bridgePath)
            this.status.running = true
            this.status.error = null
            this.notifyStatus()
          } catch {
            this.status.error = 'Failed to restart camera bridge'
            this.notifyStatus()
          }
        }, delay)
      } else {
        this.notifyStatus()
      }
    })
  }

  private notifyStatus(): void {
    if (this.onStatusChange) {
      this.onStatusChange({ ...this.status })
    }
  }
}

export const cameraBridgeService = new CameraBridgeService()
