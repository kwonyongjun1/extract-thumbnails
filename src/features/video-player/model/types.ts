import type {
  PlayerDraft,
  PlayerItem,
} from '../../../entities/thumbnail/model/types'

export type VideoPlayerFeatureProps = {
  videoSrc?: string
  poster?: string
  /**
   * 서버 썸네일로 교체:
   * (tSec) => `/api/thumb?sec=${Math.floor(tSec)}`
   */
  thumbnailUrlForTime?: (timeSec: number) => string
  selectedItem?: PlayerItem | null
  onDraftChange?: (draft: PlayerDraft) => void
  onAddItem?: (item: PlayerItem) => void
  resetDraftToken?: number
}
