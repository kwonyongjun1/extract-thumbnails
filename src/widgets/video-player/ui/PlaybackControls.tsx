import React, { useEffect, useRef, useState } from 'react'
import { formatTime } from '../../../shared/lib/player/utils'

type Props = {
    isPlaying: boolean
    filmOpen: boolean
    shouldReset: boolean
    current: number
    duration: number
    playbackRate: number
    playbackRates: number[]
    onPlayButtonClick: () => void
    setPlaybackRateSafe: (rate: number) => void
}

export default function PlaybackControls({
    isPlaying,
    filmOpen,
    shouldReset,
    current,
    duration,
    playbackRate,
    playbackRates,
    onPlayButtonClick,
    setPlaybackRateSafe,
}: Props) {
    const [speedMenuOpen, setSpeedMenuOpen] = useState(false)
    const speedMenuRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!speedMenuOpen) return
        function onDocMouseDown(e: MouseEvent) {
            const target = e.target as Node | null
            if (!speedMenuRef.current || !target) return
            if (!speedMenuRef.current.contains(target)) {
                setSpeedMenuOpen(false)
            }
        }
        function onDocKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setSpeedMenuOpen(false)
        }
        document.addEventListener('mousedown', onDocMouseDown)
        document.addEventListener('keydown', onDocKeyDown)
        return () => {
            document.removeEventListener('mousedown', onDocMouseDown)
            document.removeEventListener('keydown', onDocKeyDown)
        }
    }, [speedMenuOpen])

    return (
    <div className="d-flex gap-2 flex-wrap">
      <div className="d-flex gap-2 align-items-center">
        <button className="btn btn-sm btn-light" onClick={onPlayButtonClick}>
                    {shouldReset ? '초기화' : isPlaying && !filmOpen ? '⏸' : '▶️'}
        </button>
        <div className="small opacity-75">
                    {formatTime(current)} / {formatTime(duration)}
                </div>
            </div>
      <div className="d-flex gap-2 align-items-center">
        <div className="position-relative" ref={speedMenuRef}>
          <button
            className="btn btn-sm btn-outline-light"
            onClick={() => setSpeedMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={speedMenuOpen}
          >
                        배속 {playbackRate}
                    </button>
                    {speedMenuOpen && (
            <div
              className="position-absolute end-0 mt-2 bg-dark border border-light border-opacity-10 rounded p-2 d-flex flex-column gap-1"
              role="menu"
              style={{ minWidth: 120, zIndex: 5 }}
            >
                            {playbackRates.map((rate) => {
                                const isActive = rate === playbackRate
                                return (
                                    <button
                                        key={rate}
                                        role="menuitemradio"
                                        aria-checked={isActive}
                    className={`btn btn-sm text-start text-white ${
                      isActive ? 'bg-secondary' : 'bg-transparent'
                    }`}
                                        onClick={() => {
                                            setPlaybackRateSafe(rate)
                                            setSpeedMenuOpen(false)
                                        }}
                                    >
                                        <span>{rate}x</span>
                    {isActive && <span className="text-white">✓</span>}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

