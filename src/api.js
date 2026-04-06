// ── API service layer ─────────────────────────────────────────────────────────
// All communication between the frontend and backend goes through here.
// Each function maps directly to one backend route in server/index.js.

const BASE = 'http://localhost:3001/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${options.method || 'GET'} ${path} failed — ${res.status}`)
  return res.status === 204 ? null : res.json()
}

export const api = {
  // Tasks
  getTasks:   ()              => request('/tasks'),
  createTask: (task)          => request('/tasks',      { method: 'POST',   body: JSON.stringify(task) }),
  updateTask: (id, updates)   => request(`/tasks/${id}`,{ method: 'PATCH',  body: JSON.stringify(updates) }),
  deleteTask: (id)            => request(`/tasks/${id}`,{ method: 'DELETE' }),

  // Lists
  getLists:   ()              => request('/lists'),
  createList: (list)          => request('/lists',      { method: 'POST',   body: JSON.stringify(list) }),
}
