import React from 'react'
import { formatTime } from '../../../shared/lib/player/utils'

type Props = {
  barRef: React.RefObject<HTMLDivElement | null>
  rangeMode: boolean
  rangeStart: number
  rangeEnd: number
  rangeStartPct: number
  rangeEndPct: number
  progressPct: number
  onBarClick: (e: React.MouseEvent) => void
  onBarPointerDown: (e: React.PointerEvent) => void
  onBarPointerMove: (e: React.PointerEvent) => void
  onBarPointerUp: () => void
}

export default function SeekBar({
  barRef,
  rangeMode,
  rangeStart,
  rangeEnd,
  rangeStartPct,
  rangeEndPct,
  progressPct,
  onBarClick,
  onBarPointerDown,
  onBarPointerMove,
  onBarPointerUp,
}: Props) {
  return (
    <div
      ref={barRef}
      className="position-relative cursor-pointer"
      style={{ height: 18 }}
      onClick={onBarClick}
      onPointerDown={onBarPointerDown}
      onPointerMove={onBarPointerMove}
      onPointerUp={onBarPointerUp}
    >
      <div
        className="position-absolute start-0 end-0 top-50 translate-middle-y rounded-pill bg-light bg-opacity-25"
        style={{ height: 4 }}
      />
      <div
        className="position-absolute bg-warning border border-dark border-opacity-50 rounded"
        style={{
          left: `calc(${rangeStartPct}% - 1px)`,
          opacity: rangeMode ? 1 : 0.65,
          top: -10,
          width: 2,
          height: 20,
        }}
      />
      <div
        className="position-absolute bg-warning border border-dark border-opacity-50 rounded"
        style={{
          left: `calc(${rangeEndPct}% - 1px)`,
          opacity: rangeMode ? 1 : 0.65,
          top: -10,
          width: 2,
          height: 20,
        }}
      />
      {rangeMode && (
        <div
          className="position-absolute small px-2 py-1 rounded text-white bg-dark bg-opacity-75 border border-light border-opacity-25"
          style={{
            left: `calc(${rangeStartPct}% - 14px)`,
            top: -28,
          }}
        >
          {formatTime(rangeStart)}
        </div>
      )}
      {rangeMode && (
        <div
          className="position-absolute small px-2 py-1 rounded text-white bg-dark bg-opacity-75 border border-light border-opacity-25"
          style={{
            left: `calc(${rangeEndPct}% - 14px)`,
            top: -28,
          }}
        >
          {formatTime(rangeEnd)}
        </div>
      )}
      <div
        className="position-absolute top-50 translate-middle-y rounded-pill bg-danger"
        style={{
          width: `${progressPct}%`,
          height: 4,
        }}
      />
      <div
        className="position-absolute top-50 translate-middle-y rounded-circle bg-light"
        style={{
          left: `calc(${progressPct}% - 6px)`,
          width: 12,
          height: 12,
          boxShadow: '0 0 0 3px rgba(0,0,0,0.25)',
        }}
      />
    </div>
  )
}

