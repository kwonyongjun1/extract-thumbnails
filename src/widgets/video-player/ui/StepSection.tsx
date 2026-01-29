import { formatTime } from '../../../shared/lib/player/utils'

type StepProps = {
  addRange: { start: number; end: number }
  rangeState: {
    rangeMode: boolean
    isRangeDirty: boolean
    rangePlayActive: boolean
    activeRange: { start: number; end: number } | null
  }
  thumbState: {
    selectedThumbnailTime: number | null
    draftThumbnailUrl?: string
    filmOpen: boolean
  }
  actions: {
    onRangeButtonClick: () => void
    onRangeCancelClick: () => void
    onRangePlayClick: () => void
    onRangePlayCancelClick: () => void
    onToggleFilmstrip: () => void
    onAddCurrentSelection: () => void
  }
}

export default function StepSection({
  addRange,
  rangeState,
  thumbState,
  actions,
}: StepProps) {
  const { rangeMode, isRangeDirty, rangePlayActive, activeRange } = rangeState
  const { selectedThumbnailTime, draftThumbnailUrl, filmOpen } = thumbState
  const {
    onRangeButtonClick,
    onRangeCancelClick,
    onRangePlayClick,
    onRangePlayCancelClick,
    onToggleFilmstrip,
    onAddCurrentSelection,
  } = actions
  const addStart = Math.min(addRange.start, addRange.end)
  const addEnd = Math.max(addRange.start, addRange.end)
  const canAdd = selectedThumbnailTime != null && addEnd > addStart && !!draftThumbnailUrl

  return (
    <div className="bg-white text-dark border rounded-3 p-3 d-flex flex-column gap-2 mt-3">
      <div className="d-flex flex-column gap-1 small">
        <div className="fw-semibold">Step 1. 구간 선택</div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {addEnd > addStart
            ? `${formatTime(addStart)} ~ ${formatTime(addEnd)}`
            : '구간을 선택하세요'}
        </div>
        <div className="text-dark d-flex gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-outline-dark"
            onClick={onRangeButtonClick}
            disabled={rangeMode && !isRangeDirty}
          >
            {rangeMode ? '구간 저장' : '구간 선택'}
          </button>
          {rangeMode && (
            <button className="btn btn-sm btn-outline-dark" onClick={onRangeCancelClick}>
              구간 선택 취소
            </button>
          )}
          <button
            className="btn btn-sm btn-outline-dark"
            onClick={onRangePlayClick}
            disabled={rangePlayActive || !activeRange}
          >
            구간재생
          </button>
          <button
            className="btn btn-sm btn-outline-dark"
            onClick={onRangePlayCancelClick}
            disabled={!rangePlayActive}
          >
            구간재생 취소
          </button>
        </div>
      </div>
      <div className="d-flex flex-column gap-1 small">
        <div className="fw-semibold">Step 2. 썸네일 선택</div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {selectedThumbnailTime != null ? (
            <div className="d-flex align-items-center gap-2">
              <img
                src={draftThumbnailUrl}
                alt=""
                draggable={false}
                className="rounded border"
                style={{ width: 120 }}
              />
              <div>{formatTime(selectedThumbnailTime)}</div>
            </div>
          ) : (
            '썸네일을 선택하세요'
          )}
          <button className="btn btn-sm btn-outline-dark" onClick={onToggleFilmstrip}>
            {filmOpen ? '썸네일 닫기' : '썸네일 선택'}
          </button>
        </div>
      </div>
      <div className="d-flex justify-content-end">
        <button
          className="btn btn-sm btn-outline-dark"
          onClick={onAddCurrentSelection}
          disabled={!canAdd}
        >
          추가
        </button>
      </div>
    </div>
  )
}

