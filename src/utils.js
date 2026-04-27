// ── Date helpers ──────────────────────────────────────────────────────────────

// Returns YYYY-MM-DD in the user's *local* timezone.
// Using toISOString() returns UTC, which is off-by-one for users west of GMT
// in the evening — breaking "Due today" / "Due tomorrow" filters.
function localDateStr(d) {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function todayStr() {
  return localDateStr(new Date())
}

export function tomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return localDateStr(d)
}

// ── ID generation ─────────────────────────────────────────────────────────────

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ── Static data ───────────────────────────────────────────────────────────────

// Built-in smart lists that aggregate tasks across all user lists
export const DEFAULT_LISTS = [
  { id: 'all',     name: 'All Tasks', icon: '📋', color: '#007aff', system: true },
  { id: 'today',   name: 'My Day',    icon: '☀️',  color: '#ff9500', system: true },
  { id: 'starred', name: 'Important', icon: '⭐', color: '#ff3b30', system: true },
]

// Used when randomly assigning an icon/color to a newly created list
export const LIST_EMOJIS = ['📁','🎯','💡','🏃','📚','🎵','🍕','🌿','🔧','🎨']
export const LIST_COLORS = ['#007aff','#34c759','#ff9500','#ff3b30','#af52de','#5856d6','#00c7be','#ff2d55']

export function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}
