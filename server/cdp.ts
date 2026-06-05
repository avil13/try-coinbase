import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { generateJwt } from '@coinbase/cdp-sdk/auth'

interface ApiCredentials {
  apiKeyId: string
  apiKeySecret: string
}

function loadEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

function loadCredentials(): ApiCredentials {
  const keyFile = process.env.CDP_API_KEY_FILE ?? 'cdp_api_key.json'
  try {
    const raw = readFileSync(resolve(keyFile), 'utf8')
    const parsed = JSON.parse(raw) as { id?: string; privateKey?: string; name?: string }
    const apiKeyId = parsed.id ?? parsed.name
    const apiKeySecret = parsed.privateKey
    if (apiKeyId && apiKeySecret) return { apiKeyId, apiKeySecret }
  } catch {
    // Fall through to env vars when the key file is missing or unreadable.
  }

  const apiKeyId = process.env.CDP_API_KEY_ID ?? process.env.CDP_API_KEY_NAME
  const apiKeySecret = process.env.CDP_API_KEY_SECRET ?? process.env.CDP_API_KEY_PRIVATE_KEY
  if (!apiKeyId || !apiKeySecret) {
    throw new Error(
      'Missing CDP API credentials. Add cdp_api_key.json or set CDP_API_KEY_ID + CDP_API_KEY_SECRET.',
    )
  }

  return { apiKeyId, apiKeySecret }
}

/** Build a short-lived JWT signed with the CDP API key. */
async function buildJWT(requestHost: string, requestPath: string): Promise<string> {
  const { apiKeyId, apiKeySecret } = loadCredentials()

  return generateJwt({
    apiKeyId,
    apiKeySecret,
    requestMethod: 'POST',
    requestHost,
    requestPath,
    expiresIn: 120,
  })
}

export interface PaymentSessionResult {
  paymentSessionId: string
  paymentUrl: string
}

function checkoutCallbackUrl(origin: string, status: 'success' | 'failure'): string {
  const base = origin.replace(/\/$/, '')
  return `${base}/checkout-callback.html?status=${status}`
}

/**
 * Create a CDP Payment Acceptance session.
 * Docs: https://docs.cdp.coinbase.com/api-reference/payment-apis/rest-api/payment-acceptance-under-development/create-a-payment-session
 */
export async function createPaymentSession(
  amount: string,
  currency: string,
  origin: string,
): Promise<PaymentSessionResult> {
  const baseUrl = process.env.CDP_BASE_URL ?? 'https://sandbox.cdp.coinbase.com'
  const merchantAccountId = loadEnv('CDP_MERCHANT_ACCOUNT_ID')
  const settlementAsset = (process.env.CDP_SETTLEMENT_ASSET ?? 'usdc').toLowerCase()
  const { hostname: requestHost } = new URL(baseUrl)
  const requestPath = '/platform/v2/payment-sessions'
  const url = `${baseUrl}${requestPath}`

  const jwt = await buildJWT(requestHost, requestPath)

  const body = {
    amount,
    asset: currency.toLowerCase(),
    target: { accountId: merchantAccountId, asset: settlementAsset },
    autoCapture: true,
    redirect: {
      successUrl: checkoutCallbackUrl(origin, 'success'),
      failureUrl: checkoutCallbackUrl(origin, 'failure'),
    },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    let message = `CDP API error ${response.status}: ${text}`

    try {
      const err = JSON.parse(text) as { errorMessage?: string }
      // if (err.errorMessage?.includes('entity is not configured for payment acceptance')) {
      //   message =
      //     'Payment Acceptance is not enabled for your CDP entity. Request access at https://docs.cdp.coinbase.com/payments/payment-acceptance/overview'
      // } else if (err.errorMessage) {
      //   message = `CDP API error: ${err.errorMessage}`
      // }
    } catch {
      // Keep raw message when body is not JSON.
    }

    throw new Error(message)
  }

  const data = (await response.json()) as {
    id: string
    paymentSessionId?: string
    url?: string
  }

  const paymentSessionId = data.paymentSessionId ?? data.id
  const paymentUrl = data.url
  if (!paymentUrl) {
    throw new Error('CDP API did not return a hosted checkout URL')
  }

  return { paymentSessionId, paymentUrl }
}
