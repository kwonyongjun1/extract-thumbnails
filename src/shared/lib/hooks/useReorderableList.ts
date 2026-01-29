import { useCallback, useState } from 'react'
import type React from 'react'

export function useReorderableList<T extends { id: string }>(
  setItems: React.Dispatch<React.SetStateAction<T[]>>,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const reorderItems = useCallback((list: T[], fromId: string, toId: string) => {
    if (fromId === toId) return list
    const fromIndex = list.findIndex((item) => item.id === fromId)
    const toIndex = list.findIndex((item) => item.id === toId)
    if (fromIndex < 0 || toIndex < 0) return list
    const next = [...list]
    const [moving] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moving)
    return next
  }, [])

  const onDragStart = useCallback(
    (id: string, e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', id)
      setDraggingId(id)
    },
    [],
  )

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const onDrop = useCallback(
    (targetId: string) => {
      if (!draggingId) return
      setItems((prev) => reorderItems(prev, draggingId, targetId))
      setDraggingId(null)
    },
    [draggingId, reorderItems, setItems],
  )

  const onDragEnd = useCallback(() => {
    setDraggingId(null)
  }, [])

  const getItemDragProps = useCallback(
    (id: string) => ({
      draggable: true,
      onDragStart: (e: React.DragEvent<HTMLDivElement>) => onDragStart(id, e),
      onDragOver,
      onDrop: () => onDrop(id),
      onDragEnd,
    }),
    [onDragEnd, onDragOver, onDragStart, onDrop],
  )

  return { draggingId, getItemDragProps }
}

