import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  tracesSampleRate: 1.0,
})
