import React from 'react'
import { formatTime } from '../../../shared/lib/player/utils'

type StepProps = {
  addStart: number
  addEnd: number
  selectedThumbnailTime: number | null
  draftThumbnailUrl?: string
  canAdd: boolean
  rangeMode: boolean
  isRangeDirty: boolean
  rangePlayActive: boolean
  activeRange: { start: number; end: number } | null
  filmOpen: boolean
  onRangeButtonClick: () => void
  onRangeCancelClick: () => void
  onRangePlayClick: () => void
  onRangePlayCancelClick: () => void
  openFilmstrip: () => void
  closeFilmstrip: () => void
  onAddCurrentSelection: () => void
}

type Props = {
  stepProps: StepProps
}

export default function StepSection({ stepProps }: Props) {
  const {
    addStart,
    addEnd,
    selectedThumbnailTime,
    draftThumbnailUrl,
    canAdd,
    rangeMode,
    isRangeDirty,
    rangePlayActive,
    activeRange,
    filmOpen,
    onRangeButtonClick,
    onRangeCancelClick,
    onRangePlayClick,
    onRangePlayCancelClick,
    openFilmstrip,
    closeFilmstrip,
    onAddCurrentSelection,
  } = stepProps

  return (
    <div style={styles.addSection}>
      <div style={styles.addStep}>
        <div style={styles.addStepTitle}>Step 1. 구간 선택</div>
        <div style={styles.addStepBody}>
          {addEnd > addStart
            ? `${formatTime(addStart)} ~ ${formatTime(addEnd)}`
            : '구간을 선택하세요'}
        </div>
        <div style={{ color: 'black' }}>
          <button
            style={{
              ...styles.btn,
              ...(rangeMode && !isRangeDirty ? styles.btnDisabled : null),
              color: 'black',
            }}
            onClick={onRangeButtonClick}
            disabled={rangeMode && !isRangeDirty}
          >
            {rangeMode ? '구간 저장' : '구간 선택'}
          </button>
          {rangeMode && (
            <button
              style={{
                ...styles.btn,
                color: 'black',
              }}
              onClick={onRangeCancelClick}
            >
              구간 선택 취소
            </button>
          )}
          <button
            style={{
              ...styles.btn,
              ...(rangePlayActive || !activeRange ? styles.btnDisabled : null),
              color: 'black',
            }}
            onClick={onRangePlayClick}
            disabled={rangePlayActive || !activeRange}
          >
            구간재생
          </button>
          <button
            style={{
              ...styles.btn,
              ...(!rangePlayActive ? styles.btnDisabled : null),
              color: 'black',
            }}
            onClick={onRangePlayCancelClick}
            disabled={!rangePlayActive}
          >
            구간재생 취소
          </button>
        </div>
      </div>
      <div style={styles.addStep}>
        <div style={styles.addStepTitle}>Step 2. 썸네일 선택</div>
        <div style={styles.addStepBody}>
          {selectedThumbnailTime != null ? (
            <div style={styles.addThumbRow}>
              <img
                src={draftThumbnailUrl}
                alt=""
                draggable={false}
                style={styles.addThumbImg}
              />
              <div>{formatTime(selectedThumbnailTime)}</div>
            </div>
          ) : (
            '썸네일을 선택하세요'
          )}
          <button
            style={{
              ...styles.btn,
              color: 'black',
            }}
            onClick={() => (filmOpen ? closeFilmstrip() : openFilmstrip())}
          >
            {filmOpen ? '썸네일 닫기' : '썸네일 선택'}
          </button>
        </div>
      </div>
      <div style={styles.addActions}>
        <button
          style={{
            ...styles.btn,
            ...(canAdd ? null : styles.btnDisabled),
            color: 'black',
          }}
          onClick={onAddCurrentSelection}
          disabled={!canAdd}
        >
          추가
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  addSection: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.08)',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    color: '#111',
  },
  addStep: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
  },
  addStepTitle: {
    fontWeight: 600,
  },
  addStepBody: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  addActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  addThumbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  addThumbImg: {
    width: 120,
    height: 'auto',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.08)',
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
}

