import { useMemo, useState } from "react"
import YouTubeFilmstripPlayer from "./components/YouTubeFilmstripPlayer"
import type { PlayerDraft, PlayerItem } from "./components/YouTubeFilmstripPlayer"

type ListItem = PlayerItem & {
  pinned?: boolean
}

function App() {
  const [items, setItems] = useState<ListItem[]>([])
  const [draft, setDraft] = useState<PlayerDraft>({
    thumbnailTime: null,
    start: 0,
    end: 0,
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  )

  const canAddDraft =
    draft.thumbnailTime != null &&
    !!draft.thumbnailUrl &&
    draft.end > draft.start

  function handleAddFromDraft() {
    if (!canAddDraft || draft.thumbnailTime == null || !draft.thumbnailUrl) return
    const item: ListItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      thumbnailUrl: draft.thumbnailUrl,
      thumbnailTime: draft.thumbnailTime,
      start: draft.start,
      end: draft.end,
      pinned: false,
    }
    setItems((prev) => [...prev, item])
    setSelectedId(item.id)
  }

  function handleAddItem(item: PlayerItem) {
    const next: ListItem = { ...item, pinned: false }
    setItems((prev) => [...prev, next])
    setSelectedId(next.id)
  }

  function togglePin(itemId: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, pinned: !item.pinned } : item
      )
    )
  }

  function reorderWithPinned(list: ListItem[], fromId: string, toId: string) {
    if (fromId === toId) return list
    const fromIndex = list.findIndex((item) => item.id === fromId)
    const toIndex = list.findIndex((item) => item.id === toId)
    if (fromIndex < 0 || toIndex < 0) return list
    if (list[fromIndex].pinned || list[toIndex].pinned) return list

    const unpinned = list.filter((item) => !item.pinned)
    const fromUnpinnedIndex = unpinned.findIndex((item) => item.id === fromId)
    const toUnpinnedIndex = unpinned.findIndex((item) => item.id === toId)
    if (fromUnpinnedIndex < 0 || toUnpinnedIndex < 0) return list

    const moving = unpinned[fromUnpinnedIndex]
    unpinned.splice(fromUnpinnedIndex, 1)
    unpinned.splice(toUnpinnedIndex, 0, moving)

    const pinnedIndices = new Set(
      list.map((item, index) => (item.pinned ? index : -1)).filter((v) => v >= 0)
    )

    let upIdx = 0
    return list.map((item, index) => {
      if (pinnedIndices.has(index)) return item
      const nextItem = unpinned[upIdx]
      upIdx += 1
      return nextItem
    })
  }

  function handleDrop(targetId: string) {
    if (!draggingId) return
    setItems((prev) => reorderWithPinned(prev, draggingId, targetId))
    setDraggingId(null)
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', gap: '20px', height: '100%' }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <YouTubeFilmstripPlayer
            selectedItem={selectedItem}
            onDraftChange={setDraft}
            onAddItem={handleAddItem}
          />
        </div>
        <div >
          <div style={{ width: '600px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>thumbnail 추가/조회</div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: 12,
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.08)',
              minHeight: 200
            }}>
              {items.length === 0 && (
                <div style={{ opacity: 0.6 }}>추가된 항목이 없습니다.</div>
              )}
              {items.map((item) => {
                const isSelected = item.id === selectedId
                const isPinned = !!item.pinned
                return (
                  <div
                    key={item.id}
                    draggable={!isPinned}
                    onDragStart={(e) => {
                      if (isPinned) return
                      e.dataTransfer.effectAllowed = "move"
                      e.dataTransfer.setData("text/plain", item.id)
                      setDraggingId(item.id)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                    }}
                    onDrop={() => handleDrop(item.id)}
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      borderRadius: 10,
                      border: isSelected ? '2px solid rgba(25,118,210,0.8)' : '1px solid rgba(0,0,0,0.08)',
                      background: isPinned ? 'rgba(0,0,0,0.03)' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      style={{ width: 120, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                      <div>썸네일 시점: {item.thumbnailTime.toFixed(2)}s</div>
                      <div>시작 시점: {item.start.toFixed(2)}s</div>
                      <div>끝 시점: {item.end.toFixed(2)}s</div>
                    </div>
                    <button
                      style={{
                        marginLeft: 'auto',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 8px',
                        cursor: 'pointer',
                        background: isPinned ? 'rgba(255,214,0,0.25)' : 'rgba(0,0,0,0.05)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePin(item.id)
                      }}
                    >
                      {isPinned ? '고정됨' : '고정'}
                    </button>
                  </div>
                )
              })}
              <button
                style={{
                  marginTop: 6,
                  border: '1px dashed rgba(0,0,0,0.2)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  cursor: canAddDraft ? 'pointer' : 'not-allowed',
                  opacity: canAddDraft ? 1 : 0.5,
                  background: '#fff'
                }}
                onClick={handleAddFromDraft}
                disabled={!canAddDraft}
              >
                + 추가
              </button>
            </div>
          </div>
        </div>
      </div>
    </div >
  )
}

export default App
