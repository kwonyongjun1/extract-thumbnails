import React from 'react'
import type { PlayerItem } from '../../../entities/thumbnail/model/types'
import { formatTime } from '../../../shared/lib/player/utils'

type Props = {
    item: PlayerItem
    isSelected: boolean
    onSelect: () => void
    onRemove: () => void
    dragProps: React.HTMLAttributes<HTMLDivElement>
}

export default function ThumbnailListItem({
    item,
    isSelected,
    onSelect,
    onRemove,
    dragProps,
}: Props) {
    return (
        <div
            {...dragProps}
            onClick={onSelect}
      className={`d-flex align-items-center gap-2 p-2 rounded bg-white border${
        isSelected ? ' border-primary' : ''
      }`}
        >
      <img src={item.thumbnailUrl} alt="" className="rounded border" style={{ width: 120 }} />
      <div className="d-flex flex-column gap-1 small">
                <div>썸네일 시점: {formatTime(item.thumbnailTime)}</div>
                <div>시작 시점: {formatTime(item.start)}</div>
                <div>끝 시점: {formatTime(item.end)}</div>
            </div>
      <button
        className="btn btn-outline-danger btn-sm ms-auto"
                onClick={(e) => {
                    e.stopPropagation()
                    onRemove()
                }}
            >
                삭제
            </button>
        </div>
    )
}

