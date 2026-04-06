import * as Sentry from '@sentry/node'
import { randomUUID } from 'crypto'

// ── Simulated user pool ───────────────────────────────────────────────────────
// Rotates every 60s so you see different users in Sentry without needing auth.
const USERS = [
  { id: 'user_001', name: 'Alice Chen',    email: 'alice@acme.com',     plan: 'enterprise', region: 'us-east' },
  { id: 'user_002', name: 'Bob Martinez',  email: 'bob@startup.io',     plan: 'pro',        region: 'us-west' },
  { id: 'user_003', name: 'Carol White',   email: 'carol@freelance.co', plan: 'free',       region: 'eu-west' },
]

// ── Request context middleware ────────────────────────────────────────────────
// Runs on EVERY request — sets user context + tags before any route handler.
// This means every event (error or performance) carries this metadata.
export function requestContext(req, res, next) {
  const requestId = randomUUID()
  const user      = USERS[Math.floor(Date.now() / 60000) % USERS.length]

  // User context — shows in Contexts panel and enables "Users Affected" count
  Sentry.setUser({
    id:       user.id,
    email:    user.email,
    username: user.name,
  })

  // Tags — every one is filterable + groupable in Issues and Traces
  Sentry.setTag('user.plan',    user.plan)
  Sentry.setTag('user.region',  user.region)
  Sentry.setTag('request.id',   requestId)
  Sentry.setTag('http.method',  req.method)
  Sentry.setTag('http.route',   req.path)

  // Pass request ID back to client for correlation
  res.setHeader('X-Request-Id', requestId)

  // Breadcrumb so the trail shows each request
  Sentry.addBreadcrumb({
    category: 'http.request',
    message:  `${req.method} ${req.path}`,
    level:    'info',
    data: {
      requestId,
      user:   user.email,
      plan:   user.plan,
      region: user.region,
    }
  })

  next()
}
