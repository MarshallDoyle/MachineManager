import type { FrameMetadata } from './CameraFeed'

interface TemperatureOverlayProps {
  metadata: FrameMetadata
  imgWidth: number
  imgHeight: number
  showCrosshairs: boolean
}

export function TemperatureOverlay({ metadata, imgWidth, imgHeight, showCrosshairs }: TemperatureOverlayProps) {
  const hotPctX = imgWidth > 0 ? (metadata.hotX / imgWidth) * 100 : 0
  const hotPctY = imgHeight > 0 ? (metadata.hotY / imgHeight) * 100 : 0
  const coldPctX = imgWidth > 0 ? (metadata.coldX / imgWidth) * 100 : 0
  const coldPctY = imgHeight > 0 ? (metadata.coldY / imgHeight) * 100 : 0

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Temperature readout */}
      <div className="absolute top-2 left-2 flex flex-col gap-0.5">
        <span className="text-[10px] font-mono text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
          Mean: {metadata.mean.toFixed(1)}&deg;C
        </span>
        <span className="text-[10px] font-mono text-red-300" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
          Max: {metadata.max.toFixed(1)}&deg;C
        </span>
        <span className="text-[10px] font-mono text-cyan-300" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
          Min: {metadata.min.toFixed(1)}&deg;C
        </span>
      </div>

      {/* Hot spot crosshair */}
      {showCrosshairs && metadata.hotT > 0 && (
        <div
          className="absolute"
          style={{ left: `${hotPctX}%`, top: `${hotPctY}%`, transform: 'translate(-50%, -50%)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <line x1="8" y1="0" x2="8" y2="16" stroke="#ff4444" strokeWidth="1.5" />
            <line x1="0" y1="8" x2="16" y2="8" stroke="#ff4444" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      {/* Cold spot crosshair */}
      {showCrosshairs && metadata.coldT > 0 && (
        <div
          className="absolute"
          style={{ left: `${coldPctX}%`, top: `${coldPctY}%`, transform: 'translate(-50%, -50%)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <line x1="8" y1="0" x2="8" y2="16" stroke="#44ccff" strokeWidth="1.5" />
            <line x1="0" y1="8" x2="16" y2="8" stroke="#44ccff" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  )
}
