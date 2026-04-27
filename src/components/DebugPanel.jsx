import * as Sentry from '@sentry/react'
import { useState } from 'react'

// ── DebugPanel ────────────────────────────────────────────────────────────────
// Floating panel that lets you trigger every Sentry scenario from the UI.
// Each button corresponds to a different error/performance pattern.

const BASE = 'http://localhost:3001'

const SCENARIOS = [
  // ── Backend: Basics ─────────────────────────────────────────────────────────
  {
    group: 'Backend — Basic Errors',
    color: '#ff3b30',
    items: [
      { label: 'Sync Error',         desc: 'throw inside route handler',             url: `${BASE}/api/break` },
      { label: 'Async Error',        desc: 'throw after await',                       url: `${BASE}/api/break/async` },
      { label: 'TypeError',          desc: 'read property of undefined',              url: `${BASE}/api/break/type` },
      { label: 'DB Error',           desc: 'simulated connection timeout',            url: `${BASE}/api/break/db` },
      { label: 'Promise Rejection',  desc: 'unhandled promise rejection',             url: `${BASE}/api/break/promise` },
    ]
  },
  // ── Backend: Advanced ───────────────────────────────────────────────────────
  {
    group: 'Backend — Advanced',
    color: '#ff6b35',
    items: [
      {
        label: 'Validation Error',
        desc: 'withScope + setExtra on a 422 (handled capture)',
        url: `${BASE}/api/break/validation`,
        method: 'POST',
        body: {},              // empty body → triggers missing-field validation
      },
      {
        label: 'Auth Error',
        desc: 'custom fingerprint → all auth failures in one issue',
        url: `${BASE}/api/break/auth`,
      },
      {
        label: 'Cascade Error',
        desc: 'nested spans: auth → user-lookup → permissions FAILS',
        url: `${BASE}/api/break/cascade`,
      },
      {
        label: 'Rate Limit (429)',
        desc: 'downstream API 429, withScope + extra retry data',
        url: `${BASE}/api/break/ratelimit`,
      },
      {
        label: 'Timeout',
        desc: 'operation exceeds budget — span + extra timing data',
        url: `${BASE}/api/break/timeout`,
      },
    ]
  },
  // ── Performance ─────────────────────────────────────────────────────────────
  {
    group: 'Performance',
    color: '#ff9500',
    items: [
      { label: 'Slow Endpoint',  desc: '2-3s artificial delay with span',     url: `${BASE}/api/slow` },
      { label: 'Load Tasks',     desc: 'db.findAll with latency + spans',     url: `${BASE}/api/tasks` },
      { label: 'Load Lists',     desc: 'db.findAll with latency + spans',     url: `${BASE}/api/lists` },
    ]
  },
  // ── Frontend: Basics ────────────────────────────────────────────────────────
  {
    group: 'Frontend — Basic Errors',
    color: '#af52de',
    items: [
      { label: 'Handled Error',   desc: 'captureException in try/catch',              fn: () => { try { null.property } catch(e) { Sentry.captureException(e) } } },
      { label: 'Capture Message', desc: 'manual captureMessage warning',              fn: () => Sentry.captureMessage('Frontend warning triggered from DebugPanel', 'warning') },
      { label: 'Add Breadcrumb',  desc: 'manual breadcrumb entry',                   fn: () => Sentry.addBreadcrumb({ category: 'debug', message: 'Manual breadcrumb from DebugPanel', level: 'info', data: { triggeredAt: new Date().toISOString() } }) },
      { label: 'Render Crash',    desc: 'throws inside render → ErrorBoundary',      fn: 'render_crash' },
    ]
  },
  // ── Frontend: Advanced ──────────────────────────────────────────────────────
  {
    group: 'Frontend — Advanced',
    color: '#5e5ce6',
    items: [
      {
        label: 'withScope',
        desc: 'one-off scope: temp tags + extra on a single capture',
        fn: () => {
          Sentry.withScope(scope => {
            scope.setTag('checkout.step', 'payment')
            scope.setTag('checkout.cart_id', 'cart_abc123')
            scope.setExtra('cart', { items: 3, total: 42.99, currency: 'USD' })
            scope.setLevel('error')
            scope.captureException(new Error('PaymentError: card declined during checkout'))
          })
        },
      },
      {
        label: 'setContext',
        desc: 'rich structured context blocks attached to event',
        fn: () => {
          Sentry.setContext('device', { model: 'MacBook Pro', os: 'macOS 14', memory_gb: 16 })
          Sentry.setContext('feature_flags', { new_checkout: true, dark_mode: false, beta_ui: true })
          Sentry.captureMessage('User with rich context hit an issue', 'info')
        },
      },
      {
        label: 'Deep TypeError',
        desc: 'null.profile.preferences.theme — 4 levels deep',
        fn: () => {
          try {
            const data = { user: { profile: null } }
            // eslint-disable-next-line no-unused-vars
            const _ = data.user.profile.preferences.theme
          } catch (err) {
            Sentry.captureException(err, {
              extra: { path: 'data.user.profile.preferences.theme', context: 'reading theme preference' },
            })
          }
        },
      },
      {
        label: 'Network Timeout',
        desc: 'fetch aborted via AbortController after 500ms',
        fn: async () => {
          const controller = new AbortController()
          setTimeout(() => controller.abort(), 500)
          try {
            await fetch(`${BASE}/api/slow`, { signal: controller.signal })
          } catch (err) {
            Sentry.captureException(err, {
              tags: { 'network.timeout': 'true', 'network.budget_ms': '500' },
              extra: { url: `${BASE}/api/slow`, aborted: true },
            })
          }
        },
      },
      {
        label: 'Unhandled Promise',
        desc: 'Promise.reject() with no .catch() — global handler',
        fn: () => {
          // No .catch() — browser fires window.onunhandledrejection
          // Sentry's SDK hooks that event automatically
          Promise.reject(new Error('Unhandled frontend promise rejection — no .catch()'))
        },
      },
      {
        label: 'captureEvent',
        desc: 'raw low-level event with custom fingerprint',
        fn: () => {
          Sentry.captureEvent({
            message: 'Business event: checkout abandoned at shipping step',
            level: 'warning',
            tags: { 'checkout.step': 'shipping', 'abandon.reason': 'high_shipping_cost' },
            extra: { cart_value: 89.99, items: 5, shipping_cost: 24.99 },
            fingerprint: ['checkout-abandoned', 'shipping-cost'],
          })
        },
      },
    ]
  },
]

function CrashButton() {
  const [crash, setCrash] = useState(false)
  if (crash) throw new Error('Intentional render crash — ErrorBoundary test')
  return (
    <button onClick={() => setCrash(true)} style={btnStyle('#af52de')}>
      Render Crash <span style={descStyle}>throws inside render → ErrorBoundary</span>
    </button>
  )
}

export default function DebugPanel() {
  const [open, setOpen]     = useState(false)
  const [status, setStatus] = useState(null)

  async function fire(item) {
    setStatus({ label: item.label, state: 'loading' })
    Sentry.addBreadcrumb({ category: 'debug', message: `DebugPanel: firing "${item.label}"`, level: 'info' })
    try {
      if (item.fn) {
        await item.fn()
        setStatus({ label: item.label, state: 'done', msg: 'Sent to Sentry' })
      } else {
        const opts = item.method === 'POST'
          ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.body ?? {}) }
          : undefined
        const res = await fetch(item.url, opts)
        // 4xx/5xx are expected for error scenarios — show status but don't throw
        setStatus({ label: item.label, state: res.ok ? 'done' : 'error', msg: `HTTP ${res.status}` })
      }
    } catch (err) {
      setStatus({ label: item.label, state: 'error', msg: err.message })
    }
    setTimeout(() => setStatus(null), 3000)
  }

  return (
    <div style={panelWrap}>
      <button onClick={() => setOpen(o => !o)} style={toggleBtn}>
        {open ? '✕ Close' : '🐛 Sentry Debug'}
      </button>

      {open && (
        <div style={panelBody}>
          <div style={panelTitle}>Sentry Debug Panel</div>

          {status && (
            <div style={statusBar(status.state)}>
              {status.state === 'loading' ? '⏳' : status.state === 'done' ? '✓' : '✕'}{' '}
              {status.label} — {status.msg || 'running...'}
            </div>
          )}

          {SCENARIOS.map(group => (
            <div key={group.group} style={{ marginBottom: 12 }}>
              <div style={groupLabel(group.color)}>{group.group}</div>
              {group.items.map(item =>
                item.fn === 'render_crash'
                  ? <CrashButton key={item.label} />
                  : (
                    <button key={item.label} onClick={() => fire(item)} style={btnStyle(group.color)}>
                      {item.label} <span style={descStyle}>{item.desc}</span>
                    </button>
                  )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const panelWrap = {
  position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
  fontFamily: 'system-ui', fontSize: 13,
}
const toggleBtn = {
  background: '#1a1a2e', color: '#fff', border: '1px solid #444',
  borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600,
}
const panelBody = {
  background: '#1a1a2e', border: '1px solid #333', borderRadius: 10,
  padding: 16, marginBottom: 8, width: 340, maxHeight: '80vh', overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
}
const panelTitle = {
  color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 12,
  borderBottom: '1px solid #333', paddingBottom: 8,
}
const groupLabel = color => ({
  color, fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
  letterSpacing: 1, marginBottom: 4, marginTop: 4,
})
const btnStyle = color => ({
  display: 'block', width: '100%', textAlign: 'left',
  background: 'transparent', border: `1px solid ${color}33`,
  borderLeft: `3px solid ${color}`, color: '#eee',
  padding: '6px 10px', marginBottom: 4, borderRadius: 4,
  cursor: 'pointer', lineHeight: 1.4,
})
const descStyle = { color: '#888', fontSize: 11, display: 'block' }
const statusBar = state => ({
  padding: '6px 10px', borderRadius: 4, marginBottom: 10, fontSize: 12,
  background: state === 'loading' ? '#333' : state === 'done' ? '#1c3a1c' : '#3a1c1c',
  color: state === 'loading' ? '#aaa' : state === 'done' ? '#6fcf6f' : '#cf6f6f',
  border: `1px solid ${state === 'done' ? '#2d5a2d' : state === 'error' ? '#5a2d2d' : '#555'}`,
})
