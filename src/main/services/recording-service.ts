import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import WebSocket from 'ws'
import { adsService } from './ads-client'

export interface RecordingStatus {
  state: 'idle' | 'recording' | 'stopping'
  recordingId: string | null
  startTime: number | null
  elapsed: number
  meltpoolFrames: number
  buildPlateFrames: number
  axisDataPoints: number
}

interface RecordingManifest {
  id: string
  fileName: string
  startTime: number
  endTime?: number
  duration?: number
  meltpoolFrameCount: number
  buildPlateFrameCount: number
  axisDataPoints: number
}

function parseFrameNode(buffer: Buffer): { metadata: Record<string, unknown> | null; jpeg: Buffer } {
  // Check for old-format pure JPEG (0xFF 0xD8)
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return { metadata: null, jpeg: buffer }
  }
  // New format: [4-byte LE uint32 jsonLen][JSON][JPEG]
  if (buffer.length < 4) return { metadata: null, jpeg: buffer }
  const jsonLen = buffer.readUInt32LE(0)
  if (jsonLen === 0 || 4 + jsonLen > buffer.length) return { metadata: null, jpeg: buffer }
  try {
    const jsonStr = buffer.slice(4, 4 + jsonLen).toString('utf8')
    const metadata = JSON.parse(jsonStr)
    const jpeg = buffer.slice(4 + jsonLen)
    return { metadata, jpeg }
  } catch {
    return { metadata: null, jpeg: buffer }
  }
}

class RecordingService {
  private status: RecordingStatus = {
    state: 'idle',
    recordingId: null,
    startTime: null,
    elapsed: 0,
    meltpoolFrames: 0,
    buildPlateFrames: 0,
    axisDataPoints: 0
  }

  private recordingDir: string = ''
  private meltpoolWs: WebSocket | null = null
  private buildPlateWs: WebSocket | null = null
  private axisLogStream: fs.WriteStream | null = null
  private stateLogStream: fs.WriteStream | null = null
  private meltpoolFrameLog: fs.WriteStream | null = null
  private buildPlateFrameLog: fs.WriteStream | null = null
  private elapsedTimer: ReturnType<typeof setInterval> | null = null
  private onStatusChange: ((status: RecordingStatus) => void) | null = null

  // Accumulate axis data for batched writes
  private axisSnapshot: Record<string, number> = {}
  private axisFlushTimer: ReturnType<typeof setInterval> | null = null
  private lastProgramRunning: boolean | null = null

  setStatusCallback(callback: (status: RecordingStatus) => void): void {
    this.onStatusChange = callback
  }

  getStatus(): RecordingStatus {
    return { ...this.status }
  }

  getRecordingsDir(): string {
    return path.join(app.getPath('userData'), 'recordings')
  }

  async start(fileName: string): Promise<RecordingStatus> {
    if (this.status.state === 'recording') return this.status

    const now = new Date()
    const id = `${now.toISOString().replace(/[:.]/g, '-')}_${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    this.recordingDir = path.join(this.getRecordingsDir(), id)

    // Create directory structure
    fs.mkdirSync(path.join(this.recordingDir, 'meltpool'), { recursive: true })
    fs.mkdirSync(path.join(this.recordingDir, 'buildplate'), { recursive: true })

    // Copy G-code if available
    const gcodeSource = path.join('C:\\TwinCAT\\3.1\\Boot\\Nci', fileName)
    if (fs.existsSync(gcodeSource)) {
      fs.copyFileSync(gcodeSource, path.join(this.recordingDir, 'program.gcode'))
    }

    // Open log streams
    this.axisLogStream = fs.createWriteStream(path.join(this.recordingDir, 'axis_log.ndjson'))
    this.stateLogStream = fs.createWriteStream(path.join(this.recordingDir, 'state_log.ndjson'))
    this.meltpoolFrameLog = fs.createWriteStream(path.join(this.recordingDir, 'meltpool', 'frames_log.ndjson'))
    this.buildPlateFrameLog = fs.createWriteStream(path.join(this.recordingDir, 'buildplate', 'frames_log.ndjson'))

    // Update state
    this.status = {
      state: 'recording',
      recordingId: id,
      startTime: Date.now(),
      elapsed: 0,
      meltpoolFrames: 0,
      buildPlateFrames: 0,
      axisDataPoints: 0
    }

    // Connect to camera WebSockets
    this.connectCamera('ws://localhost:9801', 'meltpool')
    this.connectCamera('ws://localhost:9802', 'buildplate')

    // Register axis data listener
    adsService.setRecordingCallback((data) => this.handleAxisUpdate(data))

    // Start elapsed timer
    this.elapsedTimer = setInterval(() => {
      if (this.status.startTime) {
        this.status.elapsed = Date.now() - this.status.startTime
      }
      this.notifyStatus()
    }, 1000)

    // Flush axis data every 50ms
    this.axisFlushTimer = setInterval(() => this.flushAxisSnapshot(), 50)

    // Write manifest
    const manifest: RecordingManifest = {
      id,
      fileName,
      startTime: Date.now(),
      meltpoolFrameCount: 0,
      buildPlateFrameCount: 0,
      axisDataPoints: 0
    }
    fs.writeFileSync(path.join(this.recordingDir, 'recording.json'), JSON.stringify(manifest, null, 2))

    this.lastProgramRunning = null
    this.notifyStatus()
    console.log(`[Recording] Started: ${id}`)
    return this.status
  }

  async stop(): Promise<RecordingStatus> {
    if (this.status.state !== 'recording') return this.status
    this.status.state = 'stopping'

    // Disconnect cameras
    this.meltpoolWs?.close()
    this.buildPlateWs?.close()
    this.meltpoolWs = null
    this.buildPlateWs = null

    // Clear timers
    if (this.elapsedTimer) clearInterval(this.elapsedTimer)
    if (this.axisFlushTimer) clearInterval(this.axisFlushTimer)
    this.elapsedTimer = null
    this.axisFlushTimer = null

    // Unregister axis callback
    adsService.clearRecordingCallback()

    // Close streams
    this.axisLogStream?.end()
    this.stateLogStream?.end()
    this.meltpoolFrameLog?.end()
    this.buildPlateFrameLog?.end()

    // Update manifest
    const manifestPath = path.join(this.recordingDir, 'recording.json')
    if (fs.existsSync(manifestPath)) {
      const manifest: RecordingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      manifest.endTime = Date.now()
      manifest.duration = manifest.endTime - manifest.startTime
      manifest.meltpoolFrameCount = this.status.meltpoolFrames
      manifest.buildPlateFrameCount = this.status.buildPlateFrames
      manifest.axisDataPoints = this.status.axisDataPoints
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    }

    console.log(`[Recording] Stopped: ${this.status.meltpoolFrames} meltpool frames, ${this.status.buildPlateFrames} buildplate frames, ${this.status.axisDataPoints} axis points`)

    this.status.state = 'idle'
    this.notifyStatus()
    return this.status
  }

  async listRecordings(): Promise<RecordingManifest[]> {
    const dir = this.getRecordingsDir()
    if (!fs.existsSync(dir)) return []

    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const recordings: RecordingManifest[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const manifestPath = path.join(dir, entry.name, 'recording.json')
      if (fs.existsSync(manifestPath)) {
        try {
          recordings.push(JSON.parse(fs.readFileSync(manifestPath, 'utf8')))
        } catch { /* skip corrupt manifests */ }
      }
    }

    return recordings.sort((a, b) => b.startTime - a.startTime)
  }

  async loadRecording(recordingId: string): Promise<{
    manifest: RecordingManifest
    gcode: string
    axisLog: string[]
    stateLog: string[]
    meltpoolFrameLog: string[]
    buildPlateFrameLog: string[]
  }> {
    const dir = path.join(this.getRecordingsDir(), recordingId)
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'recording.json'), 'utf8'))

    const readLines = (filePath: string): string[] => {
      if (!fs.existsSync(filePath)) return []
      return fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim())
    }

    return {
      manifest,
      gcode: fs.existsSync(path.join(dir, 'program.gcode'))
        ? fs.readFileSync(path.join(dir, 'program.gcode'), 'utf8')
        : '',
      axisLog: readLines(path.join(dir, 'axis_log.ndjson')),
      stateLog: readLines(path.join(dir, 'state_log.ndjson')),
      meltpoolFrameLog: readLines(path.join(dir, 'meltpool', 'frames_log.ndjson')),
      buildPlateFrameLog: readLines(path.join(dir, 'buildplate', 'frames_log.ndjson'))
    }
  }

  readFrame(recordingId: string, camera: string, frameIndex: number): Buffer | null {
    const framePath = path.join(
      this.getRecordingsDir(),
      recordingId,
      camera,
      `frame_${String(frameIndex).padStart(5, '0')}.jpg`
    )
    if (fs.existsSync(framePath)) {
      return fs.readFileSync(framePath)
    }
    return null
  }

  private connectCamera(url: string, camera: 'meltpool' | 'buildplate'): void {
    try {
      const ws = new WebSocket(url)
      ws.binaryType = 'nodebuffer'

      ws.on('message', (data: Buffer) => {
        if (this.status.state !== 'recording') return
        const t = Date.now() - (this.status.startTime || Date.now())
        const { metadata, jpeg } = parseFrameNode(data as Buffer)

        // Write JPEG frame
        const frameCount = camera === 'meltpool' ? this.status.meltpoolFrames : this.status.buildPlateFrames
        const framePath = path.join(
          this.recordingDir, camera,
          `frame_${String(frameCount).padStart(5, '0')}.jpg`
        )
        fs.writeFile(framePath, jpeg, () => {})

        // Write frame log entry
        const logStream = camera === 'meltpool' ? this.meltpoolFrameLog : this.buildPlateFrameLog
        logStream?.write(JSON.stringify({ t, index: frameCount, metadata }) + '\n')

        if (camera === 'meltpool') this.status.meltpoolFrames++
        else this.status.buildPlateFrames++
      })

      ws.on('error', (err) => {
        console.error(`[Recording] ${camera} WS error:`, err.message)
      })

      ws.on('close', () => {
        if (this.status.state === 'recording') {
          // Reconnect after 2s
          setTimeout(() => {
            if (this.status.state === 'recording') this.connectCamera(url, camera)
          }, 2000)
        }
      })

      if (camera === 'meltpool') this.meltpoolWs = ws
      else this.buildPlateWs = ws
    } catch (err) {
      console.error(`[Recording] Failed to connect to ${camera}:`, err)
    }
  }

  private handleAxisUpdate(data: Record<string, unknown>): void {
    if (this.status.state !== 'recording') return

    // Accumulate into snapshot
    for (const [key, value] of Object.entries(data)) {
      const shortKey = key.split('.').pop() || key
      this.axisSnapshot[shortKey] = value as number

      // Check for auto-stop on program completion
      if (shortKey === 'bProgramRunning') {
        const running = value as boolean
        if (this.lastProgramRunning === true && !running) {
          // Program just stopped — auto-stop recording after 2s
          setTimeout(() => {
            if (this.status.state === 'recording') {
              console.log('[Recording] Auto-stopping — program finished')
              this.stop()
            }
          }, 2000)
        }
        this.lastProgramRunning = running
      }

      // Log state changes to state log
      if (shortKey.startsWith('n') || shortKey.startsWith('b')) {
        const t = Date.now() - (this.status.startTime || Date.now())
        this.stateLogStream?.write(JSON.stringify({ t, key: shortKey, value }) + '\n')
      }
    }
  }

  private flushAxisSnapshot(): void {
    if (this.status.state !== 'recording') return
    if (Object.keys(this.axisSnapshot).length === 0) return

    const t = Date.now() - (this.status.startTime || Date.now())
    this.axisLogStream?.write(JSON.stringify({ t, ...this.axisSnapshot }) + '\n')
    this.status.axisDataPoints++
  }

  private notifyStatus(): void {
    if (this.onStatusChange) {
      this.onStatusChange({ ...this.status })
    }
  }
}

export const recordingService = new RecordingService()
