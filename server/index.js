import * as Sentry from '@sentry/node'
import express from 'express'
import cors from 'cors'
import { db } from './db.js'
import { requestContext } from './middleware.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use(requestContext)   // ← sets user context + tags on every request

// ── In-memory store ───────────────────────────────────────────────────────────

let tasks = [
  { id: '1', title: 'Welcome to Todos!',   note: 'Tap the circle to complete a task.', done: false, priority: 'low',  due: '', listId: 'personal', createdAt: Date.now() },
  { id: '2', title: 'Add your first task', note: '',                                   done: false, priority: '',     due: '', listId: 'personal', createdAt: Date.now() - 1 },
  { id: '3', title: 'Try editing a task',  note: 'Click the pencil icon.',             done: true,  priority: 'high', due: '', listId: 'work',     createdAt: Date.now() - 2 },
]

let lists = [
  { id: 'personal', name: 'Personal', icon: '🏠', color: '#34c759' },
  { id: 'work',     name: 'Work',     icon: '💼', color: '#007aff' },
  { id: 'shopping', name: 'Shopping', icon: '🛒', color: '#ff9500' },
]

// ── Task routes ───────────────────────────────────────────────────────────────

app.get('/api/tasks', async (req, res) => {
  const result = await db.findAll('tasks', tasks)
  res.json(result)
})

app.post('/api/tasks', async (req, res) => {
  const task = { ...req.body, id: Date.now().toString(), createdAt: Date.now() }
  Sentry.setTag('task.priority', task.priority || 'none')
  Sentry.setTag('task.list_id',  task.listId   || 'unknown')
  Sentry.addBreadcrumb({ category: 'task', message: `Creating task: ${task.title}`, level: 'info', data: { priority: task.priority, listId: task.listId } })
  const created = await db.insert('tasks', tasks, task)
  res.status(201).json(created)
})

app.patch('/api/tasks/:id', async (req, res) => {
  Sentry.setTag('task.id', req.params.id)
  const action = req.body.done !== undefined ? 'toggle' : 'edit'
  Sentry.setTag('task.action', action)
  Sentry.addBreadcrumb({ category: 'task', message: `${action} task ${req.params.id}`, level: 'info' })
  const updated = await db.update('tasks', tasks, req.params.id, req.body)
  if (!updated) return res.status(404).json({ error: 'Task not found' })
  res.json(updated)
})

app.delete('/api/tasks/:id', async (req, res) => {
  Sentry.setTag('task.id',     req.params.id)
  Sentry.setTag('task.action', 'delete')
  Sentry.addBreadcrumb({ category: 'task', message: `Deleting task ${req.params.id}`, level: 'warning' })
  const removed = await db.remove('tasks', tasks, req.params.id)
  if (!removed) return res.status(404).json({ error: 'Task not found' })
  res.status(204).send()
})

// ── List routes ───────────────────────────────────────────────────────────────

app.get('/api/lists', async (req, res) => {
  const result = await db.findAll('lists', lists)
  res.json(result)
})

app.post('/api/lists', async (req, res) => {
  const list = { ...req.body, id: Date.now().toString() }
  Sentry.addBreadcrumb({ category: 'list', message: `Creating list: ${list.name}`, level: 'info' })
  const created = await db.insert('lists', lists, list)
  res.status(201).json(created)
})

// ── Error scenarios ───────────────────────────────────────────────────────────

// 1. Synchronous throw — most basic unhandled error
app.get('/api/break', (req, res) => {
  Sentry.setTag('test.type',  'sync_error')
  Sentry.setTag('test.route', '/api/break')
  throw new Error('Intentional server error — Sentry backend monitoring test')
})

// 2. Async throw — thrown after an await (tests async error propagation)
app.get('/api/break/async', async (req, res) => {
  Sentry.setTag('test.type', 'async_error')
  Sentry.addBreadcrumb({ category: 'test', message: 'Starting async operation', level: 'info' })
  await new Promise(r => setTimeout(r, 150))
  Sentry.addBreadcrumb({ category: 'test', message: 'Async operation completed, throwing now', level: 'warning' })
  throw new Error('Async error — thrown 150ms after await')
})

// 3. TypeError — accessing property of undefined (most common real-world crash)
app.get('/api/break/type', (req, res) => {
  Sentry.setTag('test.type', 'type_error')
  const user = undefined
  res.json({ name: user.name })   // TypeError: Cannot read properties of undefined
})

// 4. Unhandled promise rejection — missing await
app.get('/api/break/promise', (req, res) => {
  Sentry.setTag('test.type', 'promise_rejection')
  Promise.reject(new Error('Unhandled promise rejection — missing await'))
  res.json({ status: 'this response sends but the rejection is still captured' })
})

// 5. Slow endpoint — 2-3s response for performance monitoring demos
app.get('/api/slow', async (req, res) => {
  Sentry.setTag('test.type', 'slow_endpoint')
  const duration = 2000 + Math.floor(Math.random() * 1000)
  await Sentry.startSpan({ name: 'slow.computation', op: 'task', attributes: { 'task.duration_ms': duration } }, async () => {
    await new Promise(r => setTimeout(r, duration))
  })
  res.json({ message: 'Slow response completed', duration_ms: duration })
})

// 6. DB failure simulation — forces the 5% failure to 100% for one request
app.get('/api/break/db', async (req, res) => {
  Sentry.setTag('test.type', 'db_error')
  Sentry.addBreadcrumb({ category: 'db', message: 'Forcing DB failure', level: 'error' })
  throw new Error('DB error: tasks — simulated connection timeout')
})

// ── Error handlers ────────────────────────────────────────────────────────────

Sentry.setupExpressErrorHandler(app)

app.use((err, req, res, next) => {
  console.error(err.message)
  res.status(500).json({ error: err.message })
})

app.listen(3001, () => console.log('Server running on http://localhost:3001'))
