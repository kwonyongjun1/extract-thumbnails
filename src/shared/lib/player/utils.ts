export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function formatTime(sec: number) {
  if (!Number.isFinite(sec)) return '0:00'
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  return `${m}:${String(r).padStart(2, '0')}:${String(r).padStart(
    2,
    '0',
  )}`.replace(/^(\d+):(\d\d):(\d\d)$/, '$1:$3')
}

