import * as Sentry from '@sentry/node'

// ── Simulated database layer ──────────────────────────────────────────────────
// Wraps in-memory arrays with artificial latency + Sentry spans so the
// Traces view shows real db.query / db.write / db.delete spans with durations.
// 5% failure rate simulates real-world flakiness.

const FAILURE_RATE  = 0.05
const LATENCY       = { read: 25, write: 60, delete: 35 }  // base ms

function jitter(base) {
  return base + Math.floor(Math.random() * base * 3)
}

function delay(type) {
  return new Promise(r => setTimeout(r, jitter(LATENCY[type])))
}

function maybeThrow(op) {
  if (Math.random() < FAILURE_RATE)
    throw new Error(`DB error: ${op} — simulated connection timeout`)
}

export const db = {
  async findAll(collection, store) {
    return Sentry.startSpan(
      { name: `db.findAll ${collection}`, op: 'db.query',
        attributes: { 'db.collection': collection, 'db.operation': 'SELECT' } },
      async () => {
        await delay('read')
        maybeThrow(`findAll(${collection})`)
        return [...store]
      }
    )
  },

  async findById(collection, store, id) {
    return Sentry.startSpan(
      { name: `db.findById ${collection}`, op: 'db.query',
        attributes: { 'db.collection': collection, 'db.operation': 'SELECT', 'db.id': id } },
      async () => {
        await delay('read')
        maybeThrow(`findById(${collection}, ${id})`)
        return store.find(i => i.id === id) ?? null
      }
    )
  },

  async insert(collection, store, item) {
    return Sentry.startSpan(
      { name: `db.insert ${collection}`, op: 'db.write',
        attributes: { 'db.collection': collection, 'db.operation': 'INSERT' } },
      async () => {
        await delay('write')
        maybeThrow(`insert(${collection})`)
        store.unshift ? store.unshift(item) : store.push(item)
        return item
      }
    )
  },

  async update(collection, store, id, updates) {
    return Sentry.startSpan(
      { name: `db.update ${collection}`, op: 'db.write',
        attributes: { 'db.collection': collection, 'db.operation': 'UPDATE', 'db.id': id } },
      async () => {
        await delay('write')
        maybeThrow(`update(${collection}, ${id})`)
        const item = store.find(i => i.id === id)
        if (!item) return null
        Object.assign(item, updates)
        return item
      }
    )
  },

  async remove(collection, store, id) {
    return Sentry.startSpan(
      { name: `db.remove ${collection}`, op: 'db.delete',
        attributes: { 'db.collection': collection, 'db.operation': 'DELETE', 'db.id': id } },
      async () => {
        await delay('delete')
        maybeThrow(`remove(${collection}, ${id})`)
        const idx = store.findIndex(i => i.id === id)
        if (idx === -1) return false
        store.splice(idx, 1)
        return true
      }
    )
  }
}
