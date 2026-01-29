import { useMemo, useState } from 'react'
import VideoPlayerWidget from './widgets/video-player/ui/VideoPlayerWidget'
import ThumbnailListWidget from './widgets/thumbnail-list/ui/ThumbnailListWidget'
import { useReorderableList } from './shared/lib/hooks/useReorderableList'
import type { PlayerItem } from './entities/thumbnail/model/types'

function App() {
  const [items, setItems] = useState<PlayerItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [resetDraftToken, setResetDraftToken] = useState(0)
  const { getItemDragProps } = useReorderableList<PlayerItem>(setItems)

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  )

  function handleResetDraft() {
    setResetDraftToken((prev) => prev + 1)
  }

  function handleAddItem(item: PlayerItem) {
    setItems((prev) => [...prev, item])
    setSelectedId(item.id)
  }

  function removeItem(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId))
    setSelectedId((prev) => (prev === itemId ? null : prev))
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '20px',
          gap: '20px',
          height: '100%',
        }}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <VideoPlayerWidget
            selectedItem={selectedItem}
            onAddItem={handleAddItem}
            resetDraftToken={resetDraftToken}
          />
        </div>
        <div>
          <ThumbnailListWidget
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={removeItem}
            onResetSelection={handleResetDraft}
            getItemDragProps={getItemDragProps}
          />
        </div>
      </div>
    </div>
  )
}

export default App
