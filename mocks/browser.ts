import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

export async function startMockWorker() {
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    quiet: import.meta.env.PROD,
    onUnhandledRequest(request, print) {
      // Assets e módulos do Vite passam direto. Só avisa sobre chamadas à API sem handler.
      const { pathname } = new URL(request.url)
      if (pathname.startsWith(import.meta.env.VITE_API_URL ?? '/api')) print.warning()
    },
  })
}
