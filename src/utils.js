// ── Date helpers ──────────────────────────────────────────────────────────────

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function tomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
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
