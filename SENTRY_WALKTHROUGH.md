# Sentry Error Walkthrough — Todos App

> Running at: Frontend → http://localhost:5175 | Backend → http://localhost:3001
> Last tested: 2026-04-06

---

## How Sentry is wired up

```
Browser loads → src/main.jsx
                  └── imports src/instrument.js  (Sentry.init runs FIRST)
                  └── mounts <App />
                        └── wrapped in <Sentry.ErrorBoundary>

Node starts  → server/index.js
                  └── imports server/instrument.js  (Sentry.init runs FIRST)
                  └── registers routes
                  └── Sentry.setupExpressErrorHandler(app)   ← catches route errors
                  └── app.listen(3001)
```

---

## Error Inventory

### Error 1 — Intentional Backend Throw

| Field        | Value |
|---|---|
| **Route**    | `GET /api/break` |
| **File**     | `server/index.js:66` |
| **Type**     | Unhandled route error (sync throw) |
| **HTTP**     | 500 |
| **Response** | `{"error":"Intentional server error — Sentry backend monitoring test"}` |

**What happens step by step:**
1. Request hits `GET /api/break`
2. `throw new Error(...)` fires synchronously inside the route handler
3. Express 5 auto-catches synchronous throws and passes to error middleware
4. `Sentry.setupExpressErrorHandler` intercepts it → **sends event to Sentry**
5. Your generic error handler runs → returns 500 to the client

**What Sentry captures:**
- Full stack trace pointing to `server/index.js:67`
- Request context: method, URL, headers
- Environment + DSN routing

**How to trigger:**
```bash
curl http://localhost:3001/api/break
```

**Notes:**
```
[ space for your notes ]
```

---

### Error 2 — Task Not Found (PATCH)

| Field        | Value |
|---|---|
| **Route**    | `PATCH /api/tasks/:id` |
| **File**     | `server/index.js:38` |
| **Type**     | Handled 404 — NOT sent to Sentry automatically |
| **HTTP**     | 404 |
| **Response** | `{"error":"Task not found"}` |

**What happens step by step:**
1. Request hits `PATCH /api/tasks/nonexistent-id`
2. `tasks.find()` returns undefined
3. Route explicitly returns `res.status(404).json(...)` — **no throw, no error middleware**
4. This is a **handled response**, not an error — Sentry does NOT capture this

**Key insight:** This 404 is intentional business logic, not a crash. To track it in Sentry you'd need to manually call `Sentry.captureMessage('Task not found', 'warning')`.

**How to trigger:**
```bash
curl -X PATCH http://localhost:3001/api/tasks/fake-id \
  -H "Content-Type: application/json" \
  -d '{"done": true}'
```

**Notes:**
```
[ space for your notes ]
```

---

### Error 3 — Task Not Found (DELETE)

| Field        | Value |
|---|---|
| **Route**    | `DELETE /api/tasks/:id` |
| **File**     | `server/index.js:45` |
| **Type**     | Handled 404 — NOT sent to Sentry automatically |
| **HTTP**     | 404 |
| **Response** | `{"error":"Task not found"}` |

**What happens step by step:**
Same as Error 2 — explicit return, no throw. Sentry doesn't see it.

**How to trigger:**
```bash
curl -X DELETE http://localhost:3001/api/tasks/fake-id
```

**Notes:**
```
[ space for your notes ]
```

---

### Error 4 — Frontend API Failure (Network / 5xx)

| Field        | Value |
|---|---|
| **File**     | `src/App.jsx` — all async functions |
| **Type**     | Manually captured via `Sentry.captureException` |
| **Trigger**  | Any `api.*` call that rejects (network down, server 500) |

**What happens step by step:**
1. e.g. `toggleTask(id)` calls `api.updateTask(id, ...)`
2. `api.js` fetch throws if `res.ok` is false
3. `catch (err)` block in `App.jsx` runs
4. `Sentry.captureException(err)` → **manually sends event to Sentry**
5. App stays alive (error is handled), user sees no crash

**Key insight:** These are **handled errors** — the app recovers silently. Sentry still gets the event because you explicitly called `captureException`. Without that line, these would be invisible.

**Affected functions in App.jsx:**
- `addTask` (line ~38)
- `toggleTask` (line ~46)
- `deleteTask` (line ~56)
- `saveTask` (line ~65)
- `addList` (line ~77)
- initial data load in `useEffect` (line ~22)

**How to trigger:** Stop the server while the frontend is running, then try to add/toggle/delete a task.

**Notes:**
```
[ space for your notes ]
```

---

### Error 5 — React Render Crash (ErrorBoundary)

| Field        | Value |
|---|---|
| **File**     | `src/App.jsx:96` |
| **Type**     | React render error — caught by `Sentry.ErrorBoundary` |
| **User sees**| `"Something went wrong. Refresh to try again."` |

**What happens step by step:**
1. A component throws during React's render cycle
2. React's reconciler catches it and looks for the nearest error boundary
3. `Sentry.ErrorBoundary` is that boundary — it catches the error
4. **Sends event to Sentry** with component stack trace
5. Renders the fallback UI instead of crashing the whole page

**Key insight:** Without `Sentry.ErrorBoundary`, React would unmount the whole app and you'd get a blank white screen with no Sentry event. The boundary both saves the UX and reports the error.

**Notes:**
```
[ space for your notes ]
```

---

## Decision map: which errors reach Sentry?

```
Error occurs in route
        │
        ├── throw / unhandled  →  setupExpressErrorHandler  →  ✅ Sentry
        └── res.status(4xx)    →  handled response          →  ❌ Not Sentry (unless you add captureMessage)

Error occurs in frontend async
        │
        ├── caught + captureException  →  ✅ Sentry (app stays alive)
        └── uncaught / unhandled       →  ✅ Sentry (global handler)

Error occurs during React render
        │
        └── Sentry.ErrorBoundary  →  ✅ Sentry + fallback UI shown
```

---

## Key Sentry concepts to remember

| Concept | What it means |
|---|---|
| **DSN** | The address errors get sent to — one per project |
| **Issue** | A grouped set of identical errors — what you triage |
| **Event** | A single occurrence of an error — lives inside an Issue |
| **Breadcrumbs** | Trail of actions before the crash (clicks, fetches, console logs) |
| **Environment** | Tag errors as `production`, `dev`, etc — filter noise |
| **Release** | Tag errors to a deploy version — know when a bug was introduced |
| **tracesSampleRate** | Controls performance tracing, NOT error capture (errors always send) |
| **captureException** | Manual capture for handled errors you caught in try/catch |
| **captureMessage** | Manual capture for non-error situations (warnings, 404s, etc) |
| **setupExpressErrorHandler** | Must go BEFORE your own error middleware — captures unhandled route throws |

---

## Current config

| Setting | Frontend | Backend |
|---|---|---|
| SDK | `@sentry/react` | `@sentry/node` |
| Init file | `src/instrument.js` | `server/instrument.js` |
| DSN source | `import.meta.env.VITE_SENTRY_DSN` | `process.env.VITE_SENTRY_DSN` |
| tracesSampleRate | `0` (tracing off) | `1.0` (100% — lower in prod) |
| Error boundary | `<Sentry.ErrorBoundary>` in App.jsx | `setupExpressErrorHandler(app)` |

---

*Add your own notes below as you explore the Sentry dashboard*

## My Notes

```




```
