# Sentry Learning Lab — Project Overview

> **Purpose:** A hands-on sandbox app built to deeply learn the Sentry platform — how errors flow from code to dashboard, what data Sentry captures automatically, and how to use that data to triage, debug, and communicate about production issues.
>
> **Audience:** This doc is a plain-language walkthrough of what the project is, what errors it generates, and what each one teaches — written for anyone who wants a clear picture of what I'm working on and why.

---

## What Is This Project?

This is a full-stack **To-Do app** built in React (frontend) and Node/Express (backend) — but the app itself is just the vehicle. The real purpose is to use it as a controlled environment to:

1. Generate real errors at every layer of a web application
2. See exactly how those errors appear in the Sentry platform
3. Learn the full Sentry feature set from the perspective of someone explaining it to customers

The app is intentionally wired with **Sentry error monitoring and performance tracing on both the frontend and the backend**, with a special debug panel in the UI to trigger any error scenario on demand.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Error Monitoring | Sentry (React SDK + Node SDK) |
| Performance Tracing | Sentry Browser Tracing + Distributed Tracing |
| Sentry Project | `JAVASCRIPT-REACT-TESTING101` on `team-se.sentry.io` |

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│              Browser (React)            │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │         Todo App UI              │   │
│  │  - View / Add / Edit / Delete    │   │
│  │    tasks across custom lists     │   │
│  └──────────────┬───────────────────┘   │
│                 │ fetch() with          │
│                 │ sentry-trace header   │
└─────────────────┼───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Express API (Node.js)           │
│         localhost:3001                  │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │   requestContext middleware      │   │
│  │   (sets user + tags on every     │   │
│  │    request before it hits routes)│   │
│  └──────────────┬───────────────────┘   │
│                 │                       │
│  ┌──────────────▼───────────────────┐   │
│  │    Routes: /api/tasks, /lists,   │   │
│  │    /api/break/*, /api/slow       │   │
│  └──────────────┬───────────────────┘   │
│                 │                       │
│  ┌──────────────▼───────────────────┐   │
│  │    db.js — simulated database    │   │
│  │    (in-memory, with realistic    │   │
│  │     latency + 5% failure rate)   │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

Both layers send data to the **same Sentry project** and their traces are linked — so a single user action in the browser produces a full trace that spans from the React component, through the fetch call, into the Express route, and down to the database layer.

---

## What Sentry Captures Automatically (Without Any Code Changes)

Before explaining the intentional errors, it's worth noting what Sentry captures on its own once the SDK is installed:

- **Unhandled errors and exceptions** — any `throw` that isn't caught
- **Unhandled promise rejections** — any `Promise.reject()` without a `.catch()`
- **HTTP request details** — URL, method, status code, headers
- **Browser context** — OS, browser version, device type, screen size, timezone
- **User context** — set once at app startup, attached to every event
- **Performance traces** — every `fetch()` call becomes a span automatically
- **Breadcrumb trail** — clicks, navigations, console calls, XHR requests (last ~100 before the error)

All of this is available before a single line of custom Sentry code is written.

---

## How the Debug Panel Works

In the bottom-right corner of the running app there is a **"🐛 Sentry Debug"** panel. Clicking it opens a menu of buttons, each of which triggers a specific error or performance scenario. This makes it easy to fire any error on demand, go to Sentry, and walk through exactly what was captured.

The panel is organized into five groups — described in full in the next section.

---

## Error Scenarios — Full Breakdown

### Group 1 — Backend Basic Errors
> These are the foundational error types you'll encounter in any Node.js backend. Each one reaches Sentry via a different code path.

---

#### 1. Sync Error
**What it does:** Calls a route that executes `throw new Error(...)` synchronously inside the handler.

**What Sentry captures:**
- Full stack trace pointing to the exact line of the throw
- All request tags (user, region, request ID, HTTP method/route)
- All breadcrumbs leading up to the throw

**What this teaches:**
> This is the most basic error type. The key thing to understand is that Sentry's Express integration (`setupExpressErrorHandler`) wraps the route automatically — the developer doesn't need to write any try/catch. The error propagates to Sentry on its own.

**Customer value story:** "You don't need to change how you write your routes. Sentry catches errors at the framework level."

---

#### 2. Async Error
**What it does:** The route runs `await someDelay()` and *then* throws. The error happens asynchronously, 150ms after the request came in.

**What Sentry captures:**
- Same as above, but the breadcrumb trail shows the async timeline — you can see the "starting" breadcrumb followed by the "throwing now" breadcrumb with a 150ms gap

**What this teaches:**
> Async/await errors are the most common source of unhandled exceptions in modern Node apps. This demonstrates that Sentry handles them identically to sync errors — Express 5 async error propagation works seamlessly.

---

#### 3. TypeError
**What it does:** The route tries to access `.name` on a variable that is `undefined` — a classic `Cannot read properties of undefined` crash.

**What Sentry captures:**
- The exact variable (`user`) and property (`name`) shown in the stack frame
- The "In App" badge on the relevant frame distinguishing app code from Node internals

**What this teaches:**
> TypeErrors are the #1 most common error type in JavaScript applications. The stack trace anatomy — frame by frame, variable values, "Most Relevant" frame highlighting — is most clearly demonstrated with this type of error.

---

#### 4. DB Error
**What it does:** Simulates a database connection timeout by throwing a specific error from the database layer.

**What Sentry captures:**
- Stack trace that originates from `db.js` rather than the route handler — shows a multi-frame trace
- DB-specific breadcrumbs

**What this teaches:**
> Shows how Sentry traces the error to its actual origin, even when it propagates through multiple layers of the application. The stack trace points to `db.js`, not the route handler.

---

#### 5. Unhandled Promise Rejection
**What it does:** Calls `Promise.reject(...)` inside a route handler but does *not* use `await` — so the rejection has no catch handler. The route still sends an HTTP 200 response. The promise rejection happens silently in the background.

**What Sentry captures:**
- The unhandled rejection, even though the request appeared to succeed from the client's perspective
- The mechanism is `unhandledRejection`, visibly labeled in the issue

**What this teaches:**
> This is one of the hardest error types to notice in logs — the server responds normally and appears healthy. Sentry catches what logs can't. This is a strong "you didn't know about this bug" demo moment.

---

### Group 2 — Backend Advanced Errors
> These five scenarios each teach a distinct Sentry SDK capability beyond basic error capture.

---

#### 6. Validation Error
**What it does:** A `POST` request is sent with an empty body. The route detects missing required fields (`title`, `priority`) and manually calls `Sentry.captureException(err)` inside `Sentry.withScope(...)`. It returns a `422 Unprocessable Entity` — it doesn't crash.

**Sentry SDK feature: `withScope`**

```js
Sentry.withScope(scope => {
  scope.setTag('validation.fields_missing', 'title,priority')
  scope.setExtra('request.body', req.body)
  scope.setLevel('warning')       // not a crash — just a warning
  Sentry.captureException(err)    // only this capture gets the extra context
})
```

**What this teaches:**
> `withScope` creates a temporary context bubble. Tags and extra data set inside it only apply to that one `captureException` call — they don't leak into other events. This is critical for capturing business logic errors (validation, auth failures) without polluting the global scope.
>
> It also demonstrates that errors can be **manually captured at any level** — you don't have to throw and crash; you can capture a handled error with `warning` severity and keep the server running.

---

#### 7. Auth Error
**What it does:** Simulates an expired or missing auth token. The error is captured manually with a **custom fingerprint**.

**Sentry SDK feature: `setFingerprint`**

```js
scope.setFingerprint(['auth-failure', '{{ default }}'])
```

**What this teaches:**
> By default, Sentry groups errors by their stack trace. Two auth errors from different routes would create two separate issues. With a custom fingerprint, *all* auth failures across the entire app are forced into **one single issue** in Sentry — regardless of which route they came from or what the exact error message was.
>
> This is how engineering teams control issue grouping for known categories of errors (auth failures, payment errors, rate limit hits) and prevent issue noise.

---

#### 8. Cascade Error
**What it does:** A single API request kicks off a simulated three-service chain: Auth → User Lookup → Permissions check. The first two succeed; the third fails. The error propagates back through all three layers.

**Sentry SDK feature: Nested `startSpan`**

```
Request
  └─ service.auth (50ms, OK)
       └─ service.user-lookup (80ms, OK)
            └─ service.permissions (40ms, THROWS)
```

**What this teaches:**
> This produces a **trace waterfall** in Sentry — a visual timeline showing each service call as a horizontal bar, with the failure marker clearly on the deepest span. This is how engineering teams debug intermittent microservice failures: not by reading logs, but by seeing exactly *where* in a multi-service call chain the failure occurred and how much time each step took.
>
> The breadcrumb trail attached to the error shows each step's status message, giving a narrative of what happened before the crash.

---

#### 9. Rate Limit (429)
**What it does:** Simulates calling a downstream payments API and receiving a `429 Too Many Requests` response. Returns a 429 to the client. The error is captured manually with structured extra data about the rate limit.

**Sentry SDK feature: `setExtra` with structured data**

```js
scope.setExtra('rate_limit.retry_after_seconds', 60)
scope.setExtra('rate_limit.limit', 100)
scope.setExtra('rate_limit.remaining', 0)
```

**What this teaches:**
> `setExtra` attaches arbitrary key-value data to the event — visible in the "Additional Data" section of the issue in Sentry. Unlike tags (which are indexed and searchable), `setExtra` is for rich context that explains *why* something happened. Here it provides the full picture of the rate limit state at the time of the error.

---

#### 10. Timeout
**What it does:** Calls a vendor API that takes 1,100ms against a budget of 400ms. Captures the error with timing data and records the performance span showing the overrun.

**Sentry SDK feature: Span attributes + timing extra data**

```js
Sentry.startSpan(
  { name: 'external.slow-vendor-api', op: 'http.client',
    attributes: { 'timeout.budget_ms': 400, 'timeout.actual_ms': 1100 } },
  async () => { /* slow call */ }
)
// then capture the error with extra data
scope.setExtra('timeout.overrun_ms', 700)
```

**What this teaches:**
> This scenario links an error directly to a performance span. In Sentry you can see both the issue (the `TimeoutError`) and the trace (the span that shows the 1,100ms duration). It demonstrates how Sentry bridges **error monitoring and performance monitoring** — the same event can tell you *what* went wrong and *how slow it was*.

---

### Group 3 — Performance
> These are not errors — they demonstrate Sentry's performance monitoring and trace visibility.

| Scenario | What it shows |
|---|---|
| **Slow Endpoint** | A 2-3s endpoint with a custom `slow.computation` span. Shows up in performance monitoring with high p95 latency. |
| **Load Tasks** | Normal DB read wrapped in a `db.findAll` span. Shows realistic latency and span metadata. |
| **Load Lists** | Same as above for list data. |

**What this teaches:** Every time the app loads data, Sentry records a trace. Over time this builds up an **aggregate performance picture** — p50/p95 latency, throughput, which endpoints are slowest — without any code changes beyond the initial SDK setup.

---

### Group 4 — Frontend Basic Errors
> These match the backend basics but run entirely in the browser.

| Scenario | What it does |
|---|---|
| **Handled Error** | `try { null.property } catch(e) { Sentry.captureException(e) }` — manually captured, not a crash |
| **Capture Message** | `Sentry.captureMessage(...)` — sends a text message at `warning` level, no stack trace |
| **Add Breadcrumb** | `Sentry.addBreadcrumb(...)` — manually adds an entry to the breadcrumb trail |
| **Render Crash** | Throws inside a React render function, caught by `<Sentry.ErrorBoundary>`, shows a fallback UI |

**The Render Crash is particularly important** — it demonstrates the difference between:
- A handled error (app keeps running, user sees nothing)
- A render crash (component tree unmounts, Sentry shows it was caught by the `ErrorBoundary`)

---

### Group 5 — Frontend Advanced Errors
> Each of these teaches a distinct Sentry SDK capability on the frontend.

---

#### `withScope` — Checkout Payment Error
Captures a `PaymentError` with temporary checkout-specific context: `cart_id`, `checkout.step`, cart contents in `extra`. The scope is discarded after the capture — no other events see this data.

**Customer value story:** "If a user hits an error during checkout, you know exactly which cart, which step, and what was in it — without logging any of that to your server."

---

#### `setContext` — Rich Structured Context
Attaches two named context blocks to the event: `device` (model, OS, memory) and `feature_flags` (which features were on for this user). In Sentry, these appear as expandable sections in the event detail view.

**Customer value story:** "If a bug only happens with the new checkout flag enabled on macOS, `setContext` makes that visible instantly — you don't have to reconstruct it from scattered log fields."

---

#### Deep TypeError — `null.profile.preferences.theme`
Accesses a property four levels deep on a `null` object. Sentry shows the exact property path that failed. This is captured in a try/catch with `extra` data indicating what the code was trying to read.

**What this teaches:** Shows how Sentry's stack trace identifies the precise failing expression even when the variable names aren't obvious from the error message alone.

---

#### Network Timeout — AbortController
Fetches the slow endpoint with an `AbortController` that cancels the request after 500ms. The `AbortError` is caught and sent to Sentry with `network.timeout: true` and `network.budget_ms: 500` tags.

**What this teaches:** Client-side timeouts produce `AbortError` — a browser-native error type. This shows how to enrich browser errors with context before sending, so the issue in Sentry is "network timeout in checkout" not just "AbortError."

---

#### Unhandled Promise — `Promise.reject()` with No `.catch()`
Calls `Promise.reject(new Error(...))` with no handler. Sentry's SDK hooks `window.onunhandledrejection` automatically — no `captureException` call is needed.

**What this teaches:** The hardest frontend errors to spot are the ones that don't crash the UI. This is identical to the backend unhandled rejection scenario — the app appears to work, but Sentry saw the failure.

---

#### `captureEvent` — Raw Event with Custom Fingerprint
Sends a raw business event: "checkout abandoned at shipping step." This uses `Sentry.captureEvent({...})` directly with a fully custom fingerprint `['checkout-abandoned', 'shipping-cost']`.

**What this teaches:** `captureEvent` is the lowest-level Sentry API — you control every field. The custom fingerprint means all "checkout abandoned due to shipping cost" events group into one issue, separate from "checkout abandoned due to payment failure." This is how product teams track business events alongside technical errors in the same tool.

---

## What Data Is Attached to Every Event

Every event — regardless of type — carries the following metadata automatically, before any custom tags:

### User Context (rotates every 60 seconds in the demo)
| User | Plan | Region |
|---|---|---|
| alice@acme.com | enterprise | us-east |
| bob@startup.io | pro | us-west |
| carol@freelance.co | free | eu-west |

### Tags on Every Backend Request
| Tag | Example Value |
|---|---|
| `user.plan` | `enterprise` |
| `user.region` | `us-east` |
| `http.method` | `GET` |
| `http.route` | `/api/tasks` |
| `request.id` | `f3a2b1c4-...` (UUID) |

### Tags on Task Operations
| Tag | Example Value |
|---|---|
| `task.priority` | `high` |
| `task.list_id` | `work` |
| `task.action` | `toggle` / `edit` / `delete` |

These tags make it possible to answer questions like:
- *Are enterprise users seeing more errors than free users?*
- *Is the error rate higher in eu-west?*
- *Which action type is causing the most failures?*

...directly from the Sentry Issues feed, without writing a single database query.

---

## Sentry Concepts Covered by This Project

| Concept | Covered By |
|---|---|
| Stack trace anatomy (frames, In App badge, most relevant frame) | All error scenarios |
| Breadcrumbs (auto-captured + manual) | Every scenario includes a breadcrumb trail |
| Distributed tracing (frontend → backend in one trace) | All API calls from the UI |
| Span waterfall (nested service calls) | Cascade Error, DB spans, Slow Endpoint |
| Tags (searchable, filterable) | Every request via middleware |
| Extra / Additional Data (arbitrary context) | Validation, Rate Limit, Timeout, withScope scenarios |
| Context blocks (User, Device, Feature Flags, etc.) | setContext scenario + auto-captured Browser/Runtime |
| Error boundaries (React render crash recovery) | Render Crash scenario |
| Unhandled promise rejections (front + back) | Promise Rejection scenarios in both groups |
| Custom fingerprinting (issue grouping control) | Auth Error + captureEvent scenarios |
| `withScope` (isolated per-event context) | Validation, Auth, withScope, Payment scenarios |
| `captureMessage` vs `captureException` vs `captureEvent` | Capture Message, Raw Event scenarios |
| Performance monitoring (latency, spans, traces) | Slow Endpoint, Load Tasks, Timeout |
| `tracesSampleRate` and what it controls | Covered in setup (performance ≠ error capture) |
| `setupExpressErrorHandler` and middleware order | Backend instrumentation setup |

---

## How to Run the App

```bash
# From the project directory
npm run dev:all
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Debug Panel: bottom-right corner of the UI → "🐛 Sentry Debug"
- Sentry Dashboard: team-se.sentry.io → project JAVASCRIPT-REACT-TESTING101

---

## Summary

This project is a structured, self-contained learning environment for the Sentry platform. It covers every major Sentry feature — error capture, performance tracing, distributed traces, user context, tags, breadcrumbs, custom fingerprinting, and scope isolation — with real running code and a one-click interface to trigger any scenario. The goal is to build the depth of understanding needed to walk a customer through their own Sentry data and explain the value of each feature clearly, using real examples rather than documentation.
