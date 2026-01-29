import { useMemo, useState } from "react"
import YouTubeFilmstripPlayer from "./components/YouTubeFilmstripPlayer"
import type { PlayerItem } from "./components/YouTubeFilmstripPlayer"

type ListItem = PlayerItem

function App() {
  const [items, setItems] = useState<ListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [resetDraftToken, setResetDraftToken] = useState(0)

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  )

  function handleResetDraft() {
    setResetDraftToken((prev) => prev + 1)
  }

  function handleAddItem(item: PlayerItem) {
    const next: ListItem = { ...item }
    setItems((prev) => [...prev, next])
    setSelectedId(next.id)
  }

  function removeItem(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId))
    setSelectedId((prev) => (prev === itemId ? null : prev))
  }

  function reorderItems(list: ListItem[], fromId: string, toId: string) {
    if (fromId === toId) return list
    const fromIndex = list.findIndex((item) => item.id === fromId)
    const toIndex = list.findIndex((item) => item.id === toId)
    if (fromIndex < 0 || toIndex < 0) return list
    const next = [...list]
    const [moving] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moving)
    return next
  }

  function handleDrop(targetId: string) {
    if (!draggingId) return
    setItems((prev) => reorderItems(prev, draggingId, targetId))
    setDraggingId(null)
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', gap: '20px', height: '100%' }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <YouTubeFilmstripPlayer
            selectedItem={selectedItem}
            onAddItem={handleAddItem}
            resetDraftToken={resetDraftToken}
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
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
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
                      background: '#fff',
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
                        background: 'rgba(220,53,69,0.12)',
                        color: '#b21f2d'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeItem(item.id)
                      }}
                    >
                      삭제
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
                  cursor: 'pointer',
                  background: '#fff'
                }}
                onClick={handleResetDraft}
              >
                선택 초기화
              </button>
            </div>
          </div>
        </div>
      </div>
    </div >
  )
}

export default App
