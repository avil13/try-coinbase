export interface IframeCheckoutCallbacks {
  onSuccess(): void
  onFailure(): void
}

/**
 * Load the Coinbase hosted checkout page in an iframe.
 * Completion is signaled by checkout-callback.html via postMessage.
 */
export function mountCheckoutIframe(
  paymentUrl: string,
  iframe: HTMLIFrameElement,
  callbacks: IframeCheckoutCallbacks,
): () => void {
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return
    const data = event.data as { type?: string; status?: string } | null
    if (data?.type !== 'coinbase-checkout') return

    if (data.status === 'success') {
      callbacks.onSuccess()
    } else if (data.status === 'failure') {
      callbacks.onFailure()
    }
  }

  window.addEventListener('message', onMessage)
  iframe.src = paymentUrl

  return () => {
    window.removeEventListener('message', onMessage)
    iframe.removeAttribute('src')
  }
}
