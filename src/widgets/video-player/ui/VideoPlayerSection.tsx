import React, { useMemo } from 'react'
import { clamp } from '../../../shared/lib/player/utils'
import Filmstrip from './Filmstrip'
import SeekBar from './SeekBar'
import PlaybackControls from './PlaybackControls'

type VideoPlayerVM = {
  refs: {
    videoRef: React.RefObject<HTMLVideoElement | null>
    barRef: React.RefObject<HTMLDivElement | null>
  }
  playerState: {
    videoSrc?: string
    poster?: string
    duration: number
    current: number
    isPlaying: boolean
    shouldReset: boolean
  }
  playbackState: {
    playbackRate: number
    playbackRates: number[]
    setPlaybackRateSafe: (rate: number) => void
  }
  filmState: {
    filmOpen: boolean
    previewTime: number
    filmTranslatePx: number
    filmTimes: number[]
    thumbW: number
    centerW: number
  }
  rangeState: {
    rangeMode: boolean
    rangeStart: number
    rangeEnd: number
  }
  actions: {
    onPlayPause: () => void
    onPlayButtonClick: () => void
    onFilmPointerDown: (e: React.PointerEvent) => void
    onFilmPointerMove: (e: React.PointerEvent) => void
    onFilmPointerUp: () => void
    onBarClick: (e: React.MouseEvent) => void
    onBarPointerDown: (e: React.PointerEvent) => void
    onBarPointerMove: (e: React.PointerEvent) => void
    onBarPointerUp: () => void
  }
  helpers: {
    getThumbnailUrl: (timeSec: number) => string
  }
}

type Props = {
  vm: VideoPlayerVM
}

export default function VideoPlayerSection({ vm }: Props) {
  const { refs, playerState, playbackState, filmState, rangeState, actions, helpers } =
    vm
  const { videoRef, barRef } = refs
  const { videoSrc, poster, duration, current, isPlaying, shouldReset } = playerState
  const { playbackRate, playbackRates, setPlaybackRateSafe } = playbackState
  const { filmOpen, previewTime, filmTranslatePx, filmTimes, thumbW, centerW } =
    filmState
  const { rangeMode, rangeStart, rangeEnd } = rangeState
  const {
    onPlayPause,
    onPlayButtonClick,
    onFilmPointerDown,
    onFilmPointerMove,
    onFilmPointerUp,
    onBarClick,
    onBarPointerDown,
    onBarPointerMove,
    onBarPointerUp,
  } = actions
  const { getThumbnailUrl } = helpers
  const progressPct = useMemo(() => {
    if (!duration) return 0
    return clamp((current / duration) * 100, 0, 100)
  }, [current, duration])

  const rangeStartPct = useMemo(() => {
    if (!duration) return 0
    return clamp((rangeStart / duration) * 100, 0, 100)
  }, [rangeStart, duration])

  const rangeEndPct = useMemo(() => {
    if (!duration) return 0
    return clamp((rangeEnd / duration) * 100, 0, 100)
  }, [rangeEnd, duration])

  return (
    <div className="position-relative overflow-hidden rounded-4 bg-black shadow">
      <video
        ref={videoRef}
        src={videoSrc}
        poster={poster}
        className="w-100 d-block bg-black"
        playsInline
        onClick={onPlayPause}
      />
      <div
        className="position-absolute bottom-0 start-0 end-0 p-2 text-white"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.84), rgba(0,0,0,0.22), rgba(0,0,0,0))',
        }}
      >
        <Filmstrip
          filmOpen={filmOpen}
          filmTimes={filmTimes}
          previewTime={previewTime}
          filmTranslatePx={filmTranslatePx}
          thumbW={thumbW}
          centerW={centerW}
          getThumbnailUrl={getThumbnailUrl}
          onFilmPointerDown={onFilmPointerDown}
          onFilmPointerMove={onFilmPointerMove}
          onFilmPointerUp={onFilmPointerUp}
        />
        <SeekBar
          barRef={barRef}
          rangeMode={rangeMode}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          rangeStartPct={rangeStartPct}
          rangeEndPct={rangeEndPct}
          progressPct={progressPct}
          onBarClick={onBarClick}
          onBarPointerDown={onBarPointerDown}
          onBarPointerMove={onBarPointerMove}
          onBarPointerUp={onBarPointerUp}
        />
        <PlaybackControls
          isPlaying={isPlaying}
          filmOpen={filmOpen}
          shouldReset={shouldReset}
          current={current}
          duration={duration}
          playbackRate={playbackRate}
          playbackRates={playbackRates}
          onPlayButtonClick={onPlayButtonClick}
          setPlaybackRateSafe={setPlaybackRateSafe}
        />
      </div>
    </div>
  )
}

