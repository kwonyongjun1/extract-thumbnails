import React from 'react'
import { useFilmstripPlayer } from '../../../features/video-player/model/useFilmstripPlayer'
import type { VideoPlayerFeatureProps } from '../../../features/video-player/model/types'
import VideoPlayerSection from './VideoPlayerSection'
import StepSection from './StepSection'
import { baseCss, shellStyle } from './styles'

const SAMPLE_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

export default function VideoPlayerWidget({
  videoSrc = SAMPLE_VIDEO,
  poster,
  thumbnailUrlForTime,
  selectedItem,
  onDraftChange,
  onAddItem,
  resetDraftToken,
}: VideoPlayerFeatureProps) {
  const { videoProps, stepProps } = useFilmstripPlayer({
    videoSrc,
    poster,
    thumbnailUrlForTime,
    selectedItem,
    onDraftChange,
    onAddItem,
    resetDraftToken,
  })

  return (
    <div style={shellStyle}>
      <style>{baseCss}</style>
      <VideoPlayerSection videoProps={videoProps} />
      <StepSection stepProps={stepProps} />
    </div>
  )
}

