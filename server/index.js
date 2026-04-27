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

// 7. Validation error — manually captured with withScope (handled, not unhandled)
//    Teaches: Sentry.withScope, setExtra, setLevel, captureException on a 4xx
app.post('/api/break/validation', (req, res) => {
  Sentry.setTag('test.type', 'validation_error')
  const { title, priority } = req.body || {}
  const missing = []
  if (!title)    missing.push('title')
  if (!priority) missing.push('priority')

  if (missing.length === 0) {
    return res.json({ ok: true, received: { title, priority } })
  }

  const err = new Error(`ValidationError: missing required fields: ${missing.join(', ')}`)
  err.name = 'ValidationError'

  Sentry.withScope(scope => {
    scope.setTag('validation.fields_missing', missing.join(','))
    scope.setExtra('request.body', req.body)
    scope.setExtra('validation.missing', missing)
    scope.setLevel('warning')  // 4xx — not a fatal crash, just a warning
    Sentry.captureException(err)
  })

  res.status(422).json({ error: err.message, missing })
})

// 8. Auth error — custom fingerprint groups all auth failures under one issue
//    Teaches: scope.setFingerprint, custom grouping strategy
app.get('/api/break/auth', (req, res) => {
  Sentry.setTag('test.type', 'auth_error')
  const err = new Error('AuthError: token missing or expired')
  err.name = 'AuthError'

  Sentry.withScope(scope => {
    scope.setTag('auth.reason', 'token_expired')
    scope.setTag('auth.route', req.path)
    scope.setLevel('error')
    scope.setFingerprint(['auth-failure', '{{ default }}'])  // all auth errors → same issue
    Sentry.captureException(err)
  })

  res.status(401).json({ error: 'Unauthorized — token expired or missing' })
})

// 9. Cascading error — nested spans simulate a multi-service failure chain
//    Teaches: Sentry.startSpan nesting, breadcrumb trail, distributed trace depth
app.get('/api/break/cascade', async (req, res) => {
  Sentry.setTag('test.type', 'cascade_error')
  Sentry.addBreadcrumb({ category: 'cascade', message: 'Request received — starting auth service', level: 'info' })

  await Sentry.startSpan({ name: 'service.auth', op: 'auth', attributes: { 'service.name': 'auth' } }, async () => {
    Sentry.addBreadcrumb({ category: 'cascade', message: 'Auth service: validating token (OK)', level: 'info' })
    await new Promise(r => setTimeout(r, 50))

    await Sentry.startSpan({ name: 'service.user-lookup', op: 'db', attributes: { 'service.name': 'user-service' } }, async () => {
      Sentry.addBreadcrumb({ category: 'cascade', message: 'User service: loading profile (OK)', level: 'info' })
      await new Promise(r => setTimeout(r, 80))

      await Sentry.startSpan({ name: 'service.permissions', op: 'http.client', attributes: { 'service.name': 'permissions' } }, async () => {
        Sentry.addBreadcrumb({ category: 'cascade', message: 'Permissions service: FAILED — connection refused', level: 'error' })
        await new Promise(r => setTimeout(r, 40))
        throw new Error('CascadeError: permissions-service timed out — auth and user-lookup completed but permissions check failed')
      })
    })
  })
})

// 10. Rate limit — simulated 429 from a downstream external API
//     Teaches: withScope, extra data on a specific event, 4xx vs 5xx handling
app.get('/api/break/ratelimit', async (req, res) => {
  Sentry.setTag('test.type', 'rate_limit')
  Sentry.addBreadcrumb({ category: 'api', message: 'Calling downstream payments API...', level: 'info' })
  await new Promise(r => setTimeout(r, 120))
  Sentry.addBreadcrumb({ category: 'api', message: 'Payments API returned 429 Too Many Requests', level: 'error' })

  const err = new Error('RateLimitError: downstream payments-api returned 429 Too Many Requests')
  err.name = 'RateLimitError'

  Sentry.withScope(scope => {
    scope.setTag('external.api',     'payments-service')
    scope.setTag('http.status_code', '429')
    scope.setExtra('rate_limit.retry_after_seconds', 60)
    scope.setExtra('rate_limit.limit',     100)
    scope.setExtra('rate_limit.remaining', 0)
    scope.setLevel('warning')
    Sentry.captureException(err)
  })

  res.status(429).json({ error: 'Too many requests to payments API', retry_after: 60 })
})

// 11. Timeout — operation spans a budget window, exceeds it, then captures with perf data
//     Teaches: span attributes for timing, setMeasurement-style extra data
app.get('/api/break/timeout', async (req, res) => {
  Sentry.setTag('test.type', 'timeout')
  const BUDGET_MS = 400
  const ACTUAL_MS = 1100
  Sentry.addBreadcrumb({ category: 'perf', message: `Operation started (budget: ${BUDGET_MS}ms)`, level: 'info' })

  await Sentry.startSpan(
    { name: 'external.slow-vendor-api', op: 'http.client', attributes: { 'timeout.budget_ms': BUDGET_MS, 'timeout.actual_ms': ACTUAL_MS } },
    async () => { await new Promise(r => setTimeout(r, ACTUAL_MS)) }
  )

  Sentry.addBreadcrumb({ category: 'perf', message: `Operation took ${ACTUAL_MS}ms — exceeded ${BUDGET_MS}ms budget`, level: 'error' })
  const err = new Error(`TimeoutError: vendor-api took ${ACTUAL_MS}ms, exceeded ${BUDGET_MS}ms budget`)
  err.name = 'TimeoutError'

  Sentry.withScope(scope => {
    scope.setTag('timeout.exceeded', 'true')
    scope.setExtra('timeout.budget_ms', BUDGET_MS)
    scope.setExtra('timeout.actual_ms', ACTUAL_MS)
    scope.setExtra('timeout.overrun_ms', ACTUAL_MS - BUDGET_MS)
    Sentry.captureException(err)
  })

  res.status(504).json({ error: 'Gateway timeout', budget_ms: BUDGET_MS, actual_ms: ACTUAL_MS })
})

// ── Error handlers ────────────────────────────────────────────────────────────

Sentry.setupExpressErrorHandler(app)

app.use((err, req, res, next) => {
  console.error(err.message)
  if (res.headersSent) return next(err)
  res.status(500).json({ error: err.message })
})

const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
