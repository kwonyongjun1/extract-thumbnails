import React from 'react'
import { formatTime } from '../../../shared/lib/player/utils'

type Props = {
    filmOpen: boolean
    filmTimes: number[]
    previewTime: number
    filmTranslatePx: number
    thumbW: number
    centerW: number
    getThumbnailUrl: (timeSec: number) => string
    onFilmPointerDown: (e: React.PointerEvent) => void
    onFilmPointerMove: (e: React.PointerEvent) => void
    onFilmPointerUp: () => void
}

export default function Filmstrip({
    filmOpen,
    filmTimes,
    previewTime,
    filmTranslatePx,
    thumbW,
    centerW,
    getThumbnailUrl,
    onFilmPointerDown,
    onFilmPointerMove,
    onFilmPointerUp,
}: Props) {
    if (!filmOpen) return null

  return (
    <div
      className="mb-2 p-2 rounded-3 border border-light border-opacity-10 overflow-hidden bg-dark bg-opacity-75 shadow"
      onPointerDown={onFilmPointerDown}
      onPointerMove={onFilmPointerMove}
      onPointerUp={onFilmPointerUp}
    >
      <div
        className="d-flex gap-1 align-items-end justify-content-center"
        style={{
          transform: `translateX(${filmTranslatePx}px)`,
        }}
      >
                {filmTimes.map((t, idx) => {
                    const isCenter = idx === Math.floor(filmTimes.length / 2)
                    const url = getThumbnailUrl(t)
                    return (
            <div
              key={`${Math.floor(t)}-${idx}`}
              className={`position-relative rounded-3 overflow-hidden border border-light border-opacity-10 ${
                isCenter ? 'opacity-100 shadow' : 'opacity-75'
              }`}
              style={{ width: isCenter ? centerW : thumbW }}
              title={formatTime(t)}
              data-time={t}
            >
              <img src={url} alt="" draggable={false} className="w-100 d-block" />
              {isCenter && (
                <div className="position-absolute start-0 bottom-0 ms-2 mb-2 small px-2 py-1 rounded-pill bg-dark bg-opacity-75 border border-light border-opacity-10">
                  {formatTime(previewTime)}
                </div>
              )}
            </div>
                    )
                })}
            </div>
        </div>
    )
}

