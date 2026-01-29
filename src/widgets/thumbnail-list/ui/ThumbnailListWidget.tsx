import React from 'react'
import type { PlayerItem } from '../../../entities/thumbnail/model/types'
import ThumbnailListItem from './ThumbnailListItem'

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
        <div className="d-flex flex-column gap-2 w-100" style={{ maxWidth: 600 }}>
            <div className="fw-bold fs-6">thumbnail 추가/조회</div>
            <div className="bg-white border rounded-3 p-3 d-flex flex-column gap-2">
                {items.length === 0 && <div className="text-muted">추가된 항목이 없습니다.</div>}
                {items.map((item) => (
                    <ThumbnailListItem
                        key={item.id}
                        item={item}
                        isSelected={item.id === selectedId}
                        dragProps={getItemDragProps(item.id)}
                        onSelect={() => onSelect(item.id)}
                        onRemove={() => onRemove(item.id)}
                    />
                ))}
                <button className="btn btn-outline-secondary btn-sm align-self-start" onClick={onResetSelection}>
                    선택 초기화
                </button>
            </div>
        </div>
    )
}


