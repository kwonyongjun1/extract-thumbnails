import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PlayerItem } from '../../../entities/thumbnail/model/types'
import type { VideoPlayerFeatureProps } from './types'
import { clamp, formatTime } from '../../../shared/lib/player/utils'

function makeFakeThumbnailDataUrl(timeSec: number, w = 160, h = 90) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const hue = Math.floor((timeSec * 23) % 360)
  ctx.fillStyle = `hsl(${hue} 60% 34%)`
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    ctx.moveTo(0, (h / 6) * i)
    ctx.lineTo(w, (h / 6) * i)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font =
    '700 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(formatTime(timeSec), w / 2, h / 2)

  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(0, h - 22, w, 22)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = '600 12px ui-sans-serif, system-ui'
  ctx.textAlign = 'left'
  ctx.fillText('Preview', 10, h - 11)

  return canvas.toDataURL('image/png')
}

export function useFilmstripPlayer({
  videoSrc,
  poster,
  thumbnailUrlForTime,
  selectedItem,
  onDraftChange,
  onAddItem,
  resetDraftToken,
}: VideoPlayerFeatureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const barRef = useRef<HTMLDivElement | null>(null)

  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  const lastAppliedItemIdRef = useRef<string | null>(null)
  const pendingSelectedItemRef = useRef<PlayerItem | null>(null)

  const [filmOpen, setFilmOpen] = useState(false)

  const [previewTime, setPreviewTime] = useState(0)
  const previewTimeRef = useRef(0)
  useEffect(() => {
    previewTimeRef.current = previewTime
  }, [previewTime])

  const [selectedThumbnailTime, setSelectedThumbnailTime] = useState<
    number | null
  >(null)
  const [rangeMode, setRangeMode] = useState(false)
  const [rangeStart, setRangeStart] = useState(0)
  const [rangeEnd, setRangeEnd] = useState(0)
  const [savedRange, setSavedRange] = useState<{
    start: number
    end: number
  } | null>(null)
  const [rangePlayActive, setRangePlayActive] = useState(false)
  const [rangeEditBase, setRangeEditBase] = useState<{
    start: number
    end: number
  } | null>(null)

  const filmCount = 9
  const filmStepSec = 1
  const thumbW = 120
  const centerW = 160
  const gap = 6

  const filmDraggingRef = useRef(false)
  const filmLastXRef = useRef(0)
  const filmAccumDxRef = useRef(0)
  const filmTotalDxRef = useRef(0)
  const filmDownTimeRef = useRef<number | null>(null)

  const [filmTranslatePx, setFilmTranslatePx] = useState(0)

  const rafRef = useRef<number | null>(null)
  const pendingTranslateRef = useRef(0)
  function setTranslateRaf(px: number) {
    pendingTranslateRef.current = px
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      setFilmTranslatePx(pendingTranslateRef.current)
    })
  }

  const barDraggingRef = useRef(false)
  const rangeDraggingRef = useRef<'start' | 'end' | null>(null)

  const activeRange = useMemo(() => {
    if (!savedRange) return null
    const start = Math.min(savedRange.start, savedRange.end)
    const end = Math.max(savedRange.start, savedRange.end)
    return { start, end }
  }, [savedRange])

  function getBarRect() {
    const el = barRef.current
    return el ? el.getBoundingClientRect() : null
  }

  function timeFromClientX(clientX: number) {
    const rect = getBarRect()
    if (!rect || duration <= 0) return 0
    const x = clamp(clientX - rect.left, 0, rect.width)
    return (x / rect.width) * duration
  }

  function clampToActiveRange(timeSec: number) {
    if (!rangePlayActive || !activeRange) return timeSec
    return clamp(timeSec, activeRange.start, activeRange.end)
  }

  const getThumbnail = useCallback(
    (timeSec: number) => {
      const bucket = Math.floor(timeSec)
      return thumbnailUrlForTime
        ? thumbnailUrlForTime(bucket)
        : makeFakeThumbnailDataUrl(bucket)
    },
    [thumbnailUrlForTime],
  )

  function setRangeStartSafe(timeSec: number) {
    const t = clamp(timeSec, 0, Math.max(0, duration - 0.001))
    setRangeStart(Math.min(t, rangeEnd))
  }

  function setRangeEndSafe(timeSec: number) {
    const t = clamp(timeSec, 0, Math.max(0, duration - 0.001))
    setRangeEnd(Math.max(t, rangeStart))
  }

  const seekTo = useCallback(
    (timeSec: number) => {
      const v = videoRef.current
      if (!v) return
      const d = duration || v.duration || 0
      v.currentTime = clamp(timeSec, 0, Math.max(0, d - 0.001))
    },
    [duration],
  )

  function pauseVideo() {
    const v = videoRef.current
    if (!v) return
    if (!v.paused) v.pause()
  }

  function playVideo() {
    const v = videoRef.current
    if (!v) return
    v.play()
  }

  function setPlaybackRateSafe(rate: number) {
    const v = videoRef.current
    setPlaybackRate(rate)
    if (v) v.playbackRate = rate
  }

  const applySelectedItem = useCallback(
    (item: PlayerItem) => {
      const maxDuration = Math.max(
        0,
        (duration || videoRef.current?.duration || 0) - 0.001,
      )
      if (maxDuration <= 0) {
        pendingSelectedItemRef.current = item
        return
      }
      const start = clamp(Math.min(item.start, item.end), 0, maxDuration)
      const end = clamp(Math.max(item.start, item.end), 0, maxDuration)
      const thumb = clamp(item.thumbnailTime, 0, maxDuration)
      setRangeStart(start)
      setRangeEnd(end)
      setSavedRange({ start, end })
      setRangeMode(false)
      setRangePlayActive(false)
      setSelectedThumbnailTime(thumb)
      setPreviewTime(thumb)
      seekTo(thumb)
      lastAppliedItemIdRef.current = item.id
    },
    [duration, seekTo],
  )

  function openFilmstrip(atTime?: number) {
    const t = clamp(
      typeof atTime === 'number'
        ? atTime
        : videoRef.current?.currentTime ?? current,
      0,
      Math.max(0, duration - 0.001),
    )
    pauseVideo()
    setFilmOpen(true)
    setPreviewTime(t)
    filmAccumDxRef.current = 0
    setFilmTranslatePx(0)
  }

  function closeFilmstrip() {
    setFilmOpen(false)
    filmAccumDxRef.current = 0
    setFilmTranslatePx(0)
  }

  function onToggleFilmstrip() {
    if (filmOpen) closeFilmstrip()
    else openFilmstrip()
  }

  function onPlayPause() {
    if (filmOpen) {
      closeFilmstrip()
      playVideo()
      return
    }
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play()
    else v.pause()
  }

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onLoaded = () => {
      setDuration(v.duration || 0)
      setCurrent(v.currentTime || 0)
      setPreviewTime(v.currentTime || 0)
      if (v.duration && rangeEnd === 0) {
        setRangeStart(0)
        setRangeEnd(Math.min(5, v.duration))
      }
    }
    const onTime = () => {
      let t = v.currentTime || 0
      if (rangePlayActive && activeRange) {
        if (t < activeRange.start) {
          t = activeRange.start
          v.currentTime = activeRange.start
        } else if (t >= activeRange.end) {
          t = activeRange.end
          v.currentTime = activeRange.end
          v.pause()
        }
      }
      setCurrent(t)
      if (!filmOpen) setPreviewTime(t)
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    v.addEventListener('loadedmetadata', onLoaded)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)

    return () => {
      v.removeEventListener('loadedmetadata', onLoaded)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [filmOpen, rangeEnd, rangePlayActive, activeRange])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    if (!selectedItem) return
    if (selectedItem.id === lastAppliedItemIdRef.current) return
    queueMicrotask(() => applySelectedItem(selectedItem))
  }, [selectedItem, applySelectedItem])

  useEffect(() => {
    if (!pendingSelectedItemRef.current) return
    if (duration <= 0) return
    queueMicrotask(() => {
      if (!pendingSelectedItemRef.current) return
      applySelectedItem(pendingSelectedItemRef.current)
      pendingSelectedItemRef.current = null
    })
  }, [duration, applySelectedItem])

  useEffect(() => {
    if (resetDraftToken == null) return
    queueMicrotask(() => {
      setSelectedThumbnailTime(null)
      setSavedRange(null)
      setRangeMode(false)
      setRangePlayActive(false)
      setRangeStart(0)
      setRangeEnd(5)
      setRangeEditBase(null)
    })
  }, [resetDraftToken])

  const playbackRates = useMemo(
    () => [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4],
    [],
  )

  const addRange = savedRange ?? { start: rangeStart, end: rangeEnd }
  const addStart = Math.min(addRange.start, addRange.end)
  const addEnd = Math.max(addRange.start, addRange.end)

  const draftThumbnailUrl = useMemo(() => {
    if (selectedThumbnailTime == null) return undefined
    return getThumbnail(selectedThumbnailTime)
  }, [selectedThumbnailTime, getThumbnail])

  const canAdd =
    selectedThumbnailTime != null && addEnd > addStart && !!draftThumbnailUrl

  useEffect(() => {
    if (!onDraftChange) return
    onDraftChange({
      start: addStart,
      end: addEnd,
      thumbnailTime: selectedThumbnailTime,
      thumbnailUrl: draftThumbnailUrl,
    })
  }, [
    onDraftChange,
    addStart,
    addEnd,
    selectedThumbnailTime,
    draftThumbnailUrl,
  ])

  function onAddCurrentSelection() {
    if (
      !onAddItem ||
      !canAdd ||
      selectedThumbnailTime == null ||
      !draftThumbnailUrl
    )
      return
    onAddItem({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      thumbnailUrl: draftThumbnailUrl,
      thumbnailTime: selectedThumbnailTime,
      start: addStart,
      end: addEnd,
    })
  }

  const filmTimes = useMemo(() => {
    const mid = Math.floor(filmCount / 2)
    const base = previewTime
    const arr: number[] = []
    for (let i = 0; i < filmCount; i++) {
      const t = base + (i - mid) * filmStepSec
      arr.push(clamp(t, 0, Math.max(0, duration - 0.001)))
    }
    return arr
  }, [previewTime, duration, filmCount, filmStepSec])

  const slotPx = thumbW + gap

  function stepPreview(deltaSteps: number) {
    if (!duration) return
    const next = clamp(
      previewTimeRef.current + deltaSteps * filmStepSec,
      0,
      Math.max(0, duration - 0.001),
    )
    previewTimeRef.current = next
    setPreviewTime(next)
    seekTo(next)
  }

  function onFilmPointerDown(e: React.PointerEvent) {
    if (!duration) return
    filmDraggingRef.current = true
    pauseVideo()

    filmLastXRef.current = e.clientX
    filmAccumDxRef.current = 0
    filmTotalDxRef.current = 0
    const target = (e.target as HTMLElement | null)?.closest?.('[data-time]')
    const raw = target?.getAttribute?.('data-time')
    const parsed = raw != null ? Number(raw) : NaN
    filmDownTimeRef.current = Number.isFinite(parsed) ? parsed : null
    setTranslateRaf(0)
    ;(e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId)
  }

  function onFilmPointerMove(e: React.PointerEvent) {
    if (!filmDraggingRef.current) return

    const dx = e.clientX - filmLastXRef.current
    filmLastXRef.current = e.clientX
    filmTotalDxRef.current += Math.abs(dx)

    filmAccumDxRef.current += dx
    setTranslateRaf(filmAccumDxRef.current)

    while (filmAccumDxRef.current <= -slotPx) {
      filmAccumDxRef.current += slotPx
      setTranslateRaf(filmAccumDxRef.current)
      stepPreview(+1)
    }
    while (filmAccumDxRef.current >= slotPx) {
      filmAccumDxRef.current -= slotPx
      setTranslateRaf(filmAccumDxRef.current)
      stepPreview(-1)
    }
  }

  function onFilmPointerUp() {
    filmDraggingRef.current = false
    if (filmTotalDxRef.current < 6 && filmDownTimeRef.current != null) {
      setPreviewTime(filmDownTimeRef.current)
      seekTo(filmDownTimeRef.current)
      setSelectedThumbnailTime(filmDownTimeRef.current)
    }
    filmDownTimeRef.current = null
    filmAccumDxRef.current = 0
    setTranslateRaf(0)
  }

  function onBarClick(e: React.MouseEvent) {
    if (!duration) return
    if (rangeMode) return
    const t = clampToActiveRange(timeFromClientX(e.clientX))
    seekTo(t)
  }

  function onBarPointerDown(e: React.PointerEvent) {
    if (!duration) return
    if (rangeMode) {
      const t = timeFromClientX(e.clientX)
      const distToStart = Math.abs(t - rangeStart)
      const distToEnd = Math.abs(t - rangeEnd)
      const handle = distToStart <= distToEnd ? 'start' : 'end'
      rangeDraggingRef.current = handle
      if (handle === 'start') setRangeStartSafe(t)
      else setRangeEndSafe(t)
      ;(e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId)
      return
    }
    barDraggingRef.current = true
    ;(e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId)

    const t = clampToActiveRange(timeFromClientX(e.clientX))
    setPreviewTime(t)
    seekTo(t)
  }

  function onBarPointerMove(e: React.PointerEvent) {
    if (rangeMode) {
      if (!rangeDraggingRef.current) return
      const t = timeFromClientX(e.clientX)
      if (rangeDraggingRef.current === 'start') setRangeStartSafe(t)
      else setRangeEndSafe(t)
      return
    }
    if (!barDraggingRef.current) return
    const t = clampToActiveRange(timeFromClientX(e.clientX))
    setPreviewTime(t)
    seekTo(t)
  }

  function onBarPointerUp() {
    if (rangeMode) {
      rangeDraggingRef.current = null
      return
    }
    barDraggingRef.current = false
  }

  function onRangeButtonClick() {
    if (!rangeMode) {
      setRangeEditBase({ start: rangeStart, end: rangeEnd })
      setRangeMode(true)
      setRangePlayActive(false)
      return
    }
    if (!isRangeDirty) return
    const start = Math.min(rangeStart, rangeEnd)
    const end = Math.max(rangeStart, rangeEnd)
    setSavedRange({ start, end })
    setRangeMode(false)
    rangeDraggingRef.current = null
  }

  function onRangeCancelClick() {
    if (!rangeMode || !rangeEditBase) return
    setRangeStart(rangeEditBase.start)
    setRangeEnd(rangeEditBase.end)
    setRangeMode(false)
    rangeDraggingRef.current = null
  }

  function onRangePlayClick() {
    if (!activeRange) return
    setRangePlayActive(true)
    setRangeMode(false)
    rangeDraggingRef.current = null
    seekTo(activeRange.start)
    playVideo()
  }

  function onRangePlayCancelClick() {
    setRangePlayActive(false)
  }

  const isRangeDirty =
    rangeMode && rangeEditBase
      ? rangeEditBase.start !== rangeStart || rangeEditBase.end !== rangeEnd
      : false

  const shouldReset = useMemo(() => {
    if (rangePlayActive && activeRange) {
      return current >= activeRange.end - 0.001
    }
    return duration > 0 && current >= duration - 0.001
  }, [rangePlayActive, activeRange, current, duration])

  function onPlayButtonClick() {
    if (shouldReset) {
      const resetTo = rangePlayActive && activeRange ? activeRange.start : 0
      pauseVideo()
      seekTo(resetTo)
      return
    }
    onPlayPause()
  }

  return {
    videoProps: {
      refs: {
        videoRef,
        barRef,
      },
      playerState: {
        videoSrc,
        poster,
        duration,
        current,
        isPlaying,
        shouldReset,
      },
      playbackState: {
        playbackRate,
        playbackRates,
        setPlaybackRateSafe,
      },
      filmState: {
        filmOpen,
        previewTime,
        filmTranslatePx,
        filmTimes,
        thumbW,
        centerW,
      },
      rangeState: {
        rangeMode,
        rangeStart,
        rangeEnd,
      },
      actions: {
        onPlayPause,
        onPlayButtonClick,
        onFilmPointerDown,
        onFilmPointerMove,
        onFilmPointerUp,
        onBarClick,
        onBarPointerDown,
        onBarPointerMove,
        onBarPointerUp,
      },
      helpers: {
        getThumbnailUrl: getThumbnail,
      },
    },
    stepProps: {
      addRange,
      rangeState: {
        rangeMode,
        isRangeDirty,
        rangePlayActive,
        activeRange,
      },
      thumbState: {
        selectedThumbnailTime,
        draftThumbnailUrl,
        filmOpen,
      },
      actions: {
        onRangeButtonClick,
        onRangeCancelClick,
        onRangePlayClick,
        onRangePlayCancelClick,
        onToggleFilmstrip,
        onAddCurrentSelection,
      },
    },
  }
}
