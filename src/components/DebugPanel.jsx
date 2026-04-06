import * as Sentry from '@sentry/react'
import { useState } from 'react'

// ── DebugPanel ────────────────────────────────────────────────────────────────
// Floating panel that lets you trigger every Sentry scenario from the UI.
// Each button corresponds to a different error/performance pattern.

const BASE = 'http://localhost:3001'

const SCENARIOS = [
  {
    group: 'Backend Errors',
    color: '#ff3b30',
    items: [
      { label: 'Sync Error',         desc: 'throw inside route handler',        url: `${BASE}/api/break` },
      { label: 'Async Error',        desc: 'throw after await',                  url: `${BASE}/api/break/async` },
      { label: 'TypeError',          desc: 'read property of undefined',         url: `${BASE}/api/break/type` },
      { label: 'DB Error',           desc: 'simulated connection timeout',       url: `${BASE}/api/break/db` },
      { label: 'Promise Rejection',  desc: 'unhandled promise rejection',        url: `${BASE}/api/break/promise` },
    ]
  },
  {
    group: 'Performance',
    color: '#ff9500',
    items: [
      { label: 'Slow Endpoint',      desc: '2-3s artificial delay',             url: `${BASE}/api/slow` },
      { label: 'Load Tasks',         desc: 'db.findAll with latency + spans',   url: `${BASE}/api/tasks` },
      { label: 'Load Lists',         desc: 'db.findAll with latency + spans',   url: `${BASE}/api/lists` },
    ]
  },
  {
    group: 'Frontend Errors',
    color: '#af52de',
    items: [
      { label: 'Handled Error',      desc: 'captureException in try/catch',     fn: () => { try { null.property } catch(e) { Sentry.captureException(e) } } },
      { label: 'Capture Message',    desc: 'manual captureMessage warning',     fn: () => Sentry.captureMessage('Frontend warning triggered from DebugPanel', 'warning') },
      { label: 'Add Breadcrumb',     desc: 'manual breadcrumb entry',           fn: () => Sentry.addBreadcrumb({ category: 'debug', message: 'Manual breadcrumb from DebugPanel', level: 'info', data: { triggeredAt: new Date().toISOString() } }) },
      { label: 'Render Crash',       desc: 'throws inside render → ErrorBoundary', fn: 'render_crash' },
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
        item.fn()
        setStatus({ label: item.label, state: 'done', msg: 'Sent to Sentry' })
      } else {
        const res = await fetch(item.url)
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
