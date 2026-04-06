import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  // Performance monitoring — captures every page load and navigation as a transaction
  tracesSampleRate: 1.0,

  // Connects frontend traces to backend traces (distributed tracing)
  // When the frontend fetches localhost:3001, Sentry injects sentry-trace headers
  tracePropagationTargets: ['localhost', /^\/api\//],

  integrations: [
    Sentry.browserTracingIntegration(),  // auto-instruments fetch + page navigations
  ],
})
