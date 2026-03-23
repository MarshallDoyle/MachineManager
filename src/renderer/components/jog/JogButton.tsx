import { useCallback, useRef } from 'react'

interface JogButtonProps {
  label: string
  axis: string
  direction: string
  disabled?: boolean
  incremental?: boolean
  className?: string
}

export function JogButton({ label, axis, direction, disabled, incremental, className }: JogButtonProps) {
  const activeRef = useRef(false)

  const handleStart = useCallback(() => {
    if (disabled) return

    if (incremental) {
      // Incremental mode: single click fires a pulse (true then false)
      window.machineAPI.ads.startJog(axis, direction)
      setTimeout(() => {
        window.machineAPI.ads.stopJog(axis, direction)
      }, 100)
    } else {
      // Continuous mode: hold to move
      if (activeRef.current) return
      activeRef.current = true
      window.machineAPI.ads.startJog(axis, direction)
    }
  }, [axis, direction, disabled, incremental])

  const handleStop = useCallback(() => {
    if (incremental) return // Already handled via timeout
    if (!activeRef.current) return
    activeRef.current = false
    window.machineAPI.ads.stopJog(axis, direction)
  }, [axis, direction, incremental])

  return (
    <button
      onPointerDown={handleStart}
      onPointerUp={handleStop}
      onPointerLeave={handleStop}
      onPointerCancel={handleStop}
      disabled={disabled}
      className={`
        select-none touch-none
        px-4 py-3 rounded-md font-bold text-sm
        bg-zinc-800 border border-zinc-600 text-zinc-200
        hover:bg-zinc-700 hover:border-zinc-500
        active:bg-blue-600 active:border-blue-400 active:text-white
        disabled:opacity-30 disabled:cursor-not-allowed
        transition-colors duration-75
        ${className ?? ''}
      `}
    >
      {label}
    </button>
  )
}
