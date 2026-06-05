// const WIDGET_SCRIPT_URL =
//   'https://payments.coinbase.com/payments/components/v1/payment-link.mjs'
const WIDGET_SCRIPT_URL = 'https://payments.coinbase.com/sandbox/payments/components/v1/payment-link.mjs'

type PaymentEventDetail = Record<string, unknown>

interface CoinbasePaymentElement extends HTMLElement {
  render(options: { paymentSessionId: string }): void
  back(): void
}

function getElement(): CoinbasePaymentElement {
  const el = document.querySelector<HTMLElement>('#coinbase-payment')
  if (!el) throw new Error('#coinbase-payment element not found in DOM')
  return el as CoinbasePaymentElement
}

/** Load payment-link.mjs once; subsequent calls are no-ops. */
function loadScript(): Promise<void> {
  if (document.querySelector(`script[src="${WIDGET_SCRIPT_URL}"]`)) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'module'
    script.src = WIDGET_SCRIPT_URL
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Coinbase payment script'))
    document.head.appendChild(script)
  })
}

export type PaymentOutcome = 'success' | 'failure' | 'cancelled'

export interface WidgetCallbacks {
  onSuccess(): void
  onFailure(status: string): void
  onCancel(): void
  onError(message: string): void
}

let listenersBound = false

/**
 * Lazy-load the Coinbase payment script, then call render() with the session ID.
 * Safe to call on every Pay click — the script is only fetched once.
 */
export async function renderWidget(
  paymentSessionId: string,
  callbacks: WidgetCallbacks,
): Promise<void> {
  await loadScript()

  const el = getElement()

  // Bind events once — the element persists across re-renders
  if (!listenersBound) {
    listenersBound = true

    el.addEventListener('completed', ((e: CustomEvent<PaymentEventDetail>) => {
      const status = e.detail.status as string
      if (status === 'success') {
        callbacks.onSuccess()
      } else {
        callbacks.onFailure(status)
      }
    }) as EventListener)

    el.addEventListener('cancelled', (() => {
      callbacks.onCancel()
    }) as EventListener)

    el.addEventListener('paymentError', ((e: CustomEvent<PaymentEventDetail>) => {
      callbacks.onError(String(e.detail.error ?? 'Unknown payment error'))
    }) as EventListener)

    // Required when embedded inside an iframe
    el.addEventListener('deeplink', ((e: CustomEvent<PaymentEventDetail>) => {
      window.location.href = String(e.detail.url)
    }) as EventListener)
  }

  debugger;

  el.render({ paymentSessionId })
}
