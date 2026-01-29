import React from 'react'
import type { PlayerItem } from '../../../entities/thumbnail/model/types'
import { formatTime } from '../../../shared/lib/player/utils'

type Props = {
  items: PlayerItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onResetSelection: () => void
  getItemDragProps: (id: string) => React.HTMLAttributes<HTMLDivElement>
}

export default function ThumbnailListWidget({
  items,
  selectedId,
  onSelect,
  onRemove,
  onResetSelection,
  getItemDragProps,
}: Props) {
  return (
    <div style={{ width: '600px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>thumbnail 추가/조회</div>
      <div style={styles.listShell}>
        {items.length === 0 && <div style={{ opacity: 0.6 }}>추가된 항목이 없습니다.</div>}
        {items.map((item) => {
          const isSelected = item.id === selectedId
          return (
            <div
              key={item.id}
              {...getItemDragProps(item.id)}
              onClick={() => onSelect(item.id)}
              style={{
                ...styles.item,
                border: isSelected
                  ? '2px solid rgba(25,118,210,0.8)'
                  : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <img src={item.thumbnailUrl} alt="" style={styles.thumbnail} />
              <div style={styles.info}>
                <div>썸네일 시점: {formatTime(item.thumbnailTime)}</div>
                <div>시작 시점: {formatTime(item.start)}</div>
                <div>끝 시점: {formatTime(item.end)}</div>
              </div>
              <button
                style={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(item.id)
                }}
              >
                삭제
              </button>
            </div>
          )
        })}
        <button style={styles.resetBtn} onClick={onResetSelection}>
          선택 초기화
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  listShell: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.08)',
    minHeight: 200,
    background: '#fff',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    background: '#fff',
    cursor: 'pointer',
  },
  thumbnail: {
    width: 120,
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.08)',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 13,
  },
  deleteBtn: {
    marginLeft: 'auto',
    border: 'none',
    borderRadius: 8,
    padding: '6px 8px',
    cursor: 'pointer',
    background: 'rgba(220,53,69,0.12)',
    color: '#b21f2d',
  },
  resetBtn: {
    marginTop: 6,
    border: '1px dashed rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: '10px 12px',
    cursor: 'pointer',
    background: '#fff',
  },
}

