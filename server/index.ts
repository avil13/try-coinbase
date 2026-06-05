import 'dotenv/config'
import express from 'express'
import { createPaymentSession } from './cdp.ts'

const app = express()
app.use(express.json())

// Allow Vite dev server to call this API during development.
// In production, serve the Vite build statically and this header isn't needed.
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  next()
})

app.options('/api/checkout', (_req, res) => {
  res.sendStatus(204)
})

/**
 * Create a CDP Payment Acceptance session and return just the session ID.
 * The CDP secret key never leaves the server.
 */
app.post('/api/checkout', async (req, res) => {
  const { amount = '10.00', currency = 'usdc', origin = 'http://localhost:5173' } =
    req.body as {
      amount?: string
      currency?: string
      origin?: string
    }

  try {
    const result = await createPaymentSession(amount, currency, origin)
    res.status(201).json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[checkout] Error creating payment session:', message)
    res.status(502).json({ error: message })
  }
})

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
  console.log(`[server] Listening on http://localhost:${port}`)
})
