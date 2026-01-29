import React from 'react'
import { formatTime } from '../../../shared/lib/player/utils'

type VideoProps = {
  videoRef: React.RefObject<HTMLVideoElement>
  barRef: React.RefObject<HTMLDivElement>
  speedMenuRef: React.RefObject<HTMLDivElement>
  videoSrc?: string
  poster?: string
  duration: number
  current: number
  isPlaying: boolean
  playbackRate: number
  speedMenuOpen: boolean
  playbackRates: number[]
  filmOpen: boolean
  previewTime: number
  filmTranslatePx: number
  filmTimes: number[]
  getThumbnailUrl: (timeSec: number) => string
  progressPct: number
  rangeStartPct: number
  rangeEndPct: number
  rangeMode: boolean
  rangeStart: number
  rangeEnd: number
  shouldReset: boolean
  onPlayPause: () => void
  onPlayButtonClick: () => void
  onFilmPointerDown: (e: React.PointerEvent) => void
  onFilmPointerMove: (e: React.PointerEvent) => void
  onFilmPointerUp: () => void
  onBarClick: (e: React.MouseEvent) => void
  onBarPointerDown: (e: React.PointerEvent) => void
  onBarPointerMove: (e: React.PointerEvent) => void
  onBarPointerUp: () => void
  setPlaybackRateSafe: (rate: number) => void
  setSpeedMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
  thumbW: number
  centerW: number
}

type Props = {
  videoProps: VideoProps
}

export default function VideoPlayerSection({ videoProps }: Props) {
  const {
    videoRef,
    barRef,
    speedMenuRef,
    videoSrc,
    poster,
    duration,
    current,
    isPlaying,
    playbackRate,
    speedMenuOpen,
    playbackRates,
    filmOpen,
    previewTime,
    filmTranslatePx,
    filmTimes,
    getThumbnailUrl,
    progressPct,
    rangeStartPct,
    rangeEndPct,
    rangeMode,
    rangeStart,
    rangeEnd,
    shouldReset,
    onPlayPause,
    onPlayButtonClick,
    onFilmPointerDown,
    onFilmPointerMove,
    onFilmPointerUp,
    onBarClick,
    onBarPointerDown,
    onBarPointerMove,
    onBarPointerUp,
    setPlaybackRateSafe,
    setSpeedMenuOpen,
    thumbW,
    centerW,
  } = videoProps

  return (
    <div style={styles.player}>
      <video
        ref={videoRef}
        src={videoSrc}
        poster={poster}
        style={styles.video}
        playsInline
        onClick={onPlayPause}
      />
      <div style={styles.controls}>
        {filmOpen && (
          <div
            style={styles.filmstripWrap}
            onPointerDown={onFilmPointerDown}
            onPointerMove={onFilmPointerMove}
            onPointerUp={onFilmPointerUp}
          >
            <div
              style={{
                ...styles.filmstrip,
                transform: `translateX(${filmTranslatePx}px)`,
              }}
            >
              {filmTimes.map((t, idx) => {
                const isCenter = idx === Math.floor(filmTimes.length / 2)
                const url = getThumbnailUrl(t)
                return (
                  <div
                    key={`${Math.floor(t)}-${idx}`}
                    style={{
                      ...styles.filmThumb,
                      width: isCenter ? centerW : thumbW,
                      ...(isCenter ? styles.filmThumbCenter : null),
                    }}
                    title={formatTime(t)}
                    data-time={t}
                  >
                    <img src={url} alt="" draggable={false} style={styles.filmImg} />
                    {isCenter && (
                      <div style={styles.filmTimeBadge}>{formatTime(previewTime)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div
          ref={barRef}
          style={styles.seekBar}
          onClick={onBarClick}
          onPointerDown={onBarPointerDown}
          onPointerMove={onBarPointerMove}
          onPointerUp={onBarPointerUp}
        >
          <div style={styles.track} />
          <div
            style={{
              ...styles.rangeMarker,
              left: `calc(${rangeStartPct}% - 1px)`,
              opacity: rangeMode ? 1 : 0.65,
            }}
          />
          <div
            style={{
              ...styles.rangeMarker,
              left: `calc(${rangeEndPct}% - 1px)`,
              opacity: rangeMode ? 1 : 0.65,
            }}
          />
          {rangeMode && (
            <div
              style={{
                ...styles.rangeLabel,
                left: `calc(${rangeStartPct}% - 14px)`,
              }}
            >
              {formatTime(rangeStart)}
            </div>
          )}
          {rangeMode && (
            <div
              style={{
                ...styles.rangeLabel,
                left: `calc(${rangeEndPct}% - 14px)`,
              }}
            >
              {formatTime(rangeEnd)}
            </div>
          )}
          <div style={{ ...styles.fill, width: `${progressPct}%` }} />
          <div style={{ ...styles.knob, left: `calc(${progressPct}% - 6px)` }} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              style={{
                ...styles.btn,
                color: 'black',
              }}
              onClick={onPlayButtonClick}
            >
              {shouldReset ? '초기화' : isPlaying && !filmOpen ? '⏸' : '▶️'}
            </button>
            <div style={styles.timeText}>
              {formatTime(current)} / {formatTime(duration)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={styles.speedWrap} ref={speedMenuRef}>
              <button
                style={styles.speedBtn}
                onClick={() => setSpeedMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={speedMenuOpen}
              >
                배속 {playbackRate}
              </button>
              {speedMenuOpen && (
                <div style={styles.speedMenu} role="menu">
                  {playbackRates.map((rate) => {
                    const isActive = rate === playbackRate
                    return (
                      <button
                        key={rate}
                        role="menuitemradio"
                        aria-checked={isActive}
                        style={{
                          ...styles.speedMenuItem,
                          ...(isActive ? styles.speedMenuItemActive : null),
                        }}
                        onClick={() => {
                          setPlaybackRateSafe(rate)
                          setSpeedMenuOpen(false)
                        }}
                      >
                        <span>{rate}x</span>
                        {isActive && <span style={styles.speedCheck}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  player: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    background: '#000',
    boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
  },
  video: {
    width: '100%',
    height: 'auto',
    display: 'block',
    background: '#000',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: '10px 10px 10px',
    background:
      'linear-gradient(to top, rgba(0,0,0,0.84), rgba(0,0,0,0.22), rgba(0,0,0,0))',
  },
  btn: {
    appearance: 'none',
    border: 'none',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    borderRadius: 10,
    padding: '8px 10px',
    cursor: 'pointer',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  timeText: {
    fontSize: 12,
    opacity: 0.9,
    userSelect: 'none',
  },
  filmstripWrap: {
    marginBottom: 10,
    padding: '8px 8px 10px',
    borderRadius: 12,
    background: 'rgba(15,15,15,0.82)',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 10px 22px rgba(0,0,0,0.35)',
    overflow: 'hidden',
    touchAction: 'none',
  },
  filmstrip: {
    display: 'flex',
    gap: 6,
    alignItems: 'flex-end',
    justifyContent: 'center',
    willChange: 'transform',
  },
  filmThumb: {
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid rgba(255,255,255,0.10)',
    opacity: 0.9,
    flex: '0 0 auto',
    transform: 'translateZ(0)',
  },
  filmThumbCenter: {
    opacity: 1,
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
  },
  filmImg: {
    width: '100%',
    height: 'auto',
    display: 'block',
    userSelect: 'none',
  },
  filmTimeBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    fontSize: 12,
    padding: '4px 8px',
    borderRadius: 999,
    background: 'rgba(0,0,0,0.65)',
    border: '1px solid rgba(255,255,255,0.14)',
  },
  seekBar: {
    position: 'relative',
    height: 18,
    cursor: 'pointer',
    touchAction: 'none',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 4,
    transform: 'translateY(-50%)',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.25)',
  },
  rangeMarker: {
    position: 'absolute',
    top: -10,
    width: 2,
    height: 20,
    background: 'rgba(255,214,0,0.95)',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
    borderRadius: 2,
    pointerEvents: 'none',
  },
  rangeLabel: {
    position: 'absolute',
    top: -28,
    fontSize: 11,
    padding: '2px 6px',
    borderRadius: 6,
    background: 'rgba(0,0,0,0.7)',
    border: '1px solid rgba(255,255,255,0.12)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: '50%',
    height: 4,
    transform: 'translateY(-50%)',
    borderRadius: 999,
    background: 'rgba(255, 0, 0, 0.95)',
  },
  knob: {
    position: 'absolute',
    top: '50%',
    width: 12,
    height: 12,
    transform: 'translateY(-50%)',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.95)',
    boxShadow: '0 0 0 3px rgba(0,0,0,0.25)',
    pointerEvents: 'none',
  },
  speedWrap: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  },
  speedBtn: {
    appearance: 'none',
    border: 'none',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    borderRadius: 10,
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: 12,
    letterSpacing: 0.1,
  },
  speedMenu: {
    position: 'absolute',
    right: 0,
    bottom: 'calc(100% + 6px)',
    minWidth: 120,
    background: 'rgba(20,20,20,0.98)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 10,
    padding: 6,
    boxShadow: '0 10px 22px rgba(0,0,0,0.45)',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    zIndex: 5,
  },
  speedMenuItem: {
    appearance: 'none',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'left',
    padding: '6px 8px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  speedMenuItemActive: {
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
  },
  speedCheck: {
    fontSize: 12,
    color: '#fff',
  },
}

