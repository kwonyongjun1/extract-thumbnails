import { useFilmstripPlayer } from '../../../features/video-player/model/useFilmstripPlayer'
import type { VideoPlayerFeatureProps } from '../../../features/video-player/model/types'
import VideoPlayerSection from './VideoPlayerSection'
import StepSection from './StepSection'

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
    <div className="container py-3">
      <VideoPlayerSection vm={videoProps} />
      <StepSection {...stepProps} />
    </div>
  )
}

