import { setupWorker } from 'msw/browser'
import { mockControls, type MockControls } from './controls'
import { handlers } from './handlers'
import { resumePendingOrders } from './lib/orders'

declare global {
  interface Window {
    __mocks?: MockControls
  }
}

export const worker = setupWorker(...handlers)

/**
 * Lê `?scenario=<nome>` e `?mocks-reset` da URL, aplica e remove da barra de
 * endereço para não interferir no estado das rotas.
 */
function applyUrlControls() {
  const url = new URL(window.location.href)
  const scenario = url.searchParams.get('scenario')
  const reset = url.searchParams.has('mocks-reset')
  if (!scenario && !reset) return

  if (scenario) mockControls.setScenario(scenario)
  else mockControls.reset()
  url.searchParams.delete('scenario')
  url.searchParams.delete('mocks-reset')
  window.history.replaceState(window.history.state, '', url)
}

export async function startMockWorker() {
  applyUrlControls()
  window.__mocks = mockControls

  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    quiet: import.meta.env.PROD,
    onUnhandledRequest(request, print) {
      // Assets e módulos do Vite passam direto. Só avisa sobre chamadas à API sem handler.
      const { pathname } = new URL(request.url)
      if (pathname.startsWith(import.meta.env.VITE_API_URL ?? '/api')) print.warning()
    },
  })
  resumePendingOrders()
}
