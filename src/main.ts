import './style.css'
import { renderWidget } from './payments/widget.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <section id="center">
    <h1>Coinbase Payments</h1>
    <p>Click the button below to pay $10.00 in USDC.</p>

    <button id="pay-btn" type="button">Pay $10.00</button>
    <p id="pay-error" class="pay-error" hidden></p>

    <div id="checkout-panel" hidden>
      <div id="checkout-header">
        <span>Complete your payment</span>
        <button id="checkout-close" type="button" aria-label="Close">&times;</button>
      </div>
      <coinbase-payment id="coinbase-payment" layout="single-column"></coinbase-payment>
    </div>
  </section>
`

const payBtn = document.querySelector<HTMLButtonElement>('#pay-btn')!
const errorEl = document.querySelector<HTMLParagraphElement>('#pay-error')!
const panel = document.querySelector<HTMLDivElement>('#checkout-panel')!
const closeBtn = document.querySelector<HTMLButtonElement>('#checkout-close')!

function showError(message: string) {
  errorEl.textContent = message
  errorEl.hidden = false
}

function clearError() {
  errorEl.hidden = true
  errorEl.textContent = ''
}

function openPanel() {
  panel.hidden = false
}

function closePanel() {
  panel.hidden = true
}

function setLoading(loading: boolean) {
  payBtn.disabled = loading
  payBtn.textContent = loading ? 'Loading…' : 'Pay $10.00'
}

closeBtn.addEventListener('click', () => {
  closePanel()
  setLoading(false)
})

payBtn.addEventListener('click', async () => {
  clearError()
  setLoading(true)

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '10.00', currency: 'usdc' }),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (response.status === 502 && !data.error) {
        throw new Error(
          'Backend unavailable. Run ./use.sh or start npm run dev:server in a separate terminal.',
        )
      }
      throw new Error(data.error ?? `Server error ${response.status}`)
    }

    const { paymentSessionId } = (await response.json()) as { paymentSessionId: string }

    openPanel()

    await renderWidget(paymentSessionId, {
      onSuccess() {
        closePanel()
        payBtn.textContent = 'Payment successful!'
        payBtn.disabled = true
      },
      onFailure(status) {
        closePanel()
        showError(`Payment failed (${status}). Please try again.`)
        setLoading(false)
      },
      onCancel() {
        closePanel()
        setLoading(false)
      },
      onError(message) {
        showError(`Payment error: ${message}`)
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    showError(message)
    setLoading(false)
  }
})
