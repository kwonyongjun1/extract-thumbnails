import type {
  PlayerDraft,
  PlayerItem,
} from '../../../entities/thumbnail/model/types'

export type VideoPlayerFeatureProps = {
  videoSrc?: string
  poster?: string
  thumbnailUrlForTime?: (timeSec: number) => string
  selectedItem?: PlayerItem | null
  onDraftChange?: (draft: PlayerDraft) => void
  onAddItem?: (item: PlayerItem) => void
  resetDraftToken?: number
}
