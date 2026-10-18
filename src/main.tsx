/**
 * Ponto de entrada. Os mocks precisam iniciar antes de qualquer módulo da
 * aplicação ser carregado: o transporte WebSocket do socket.io-client guarda a
 * referência do `WebSocket` global ao ser importado, e o MSW só intercepta
 * conexões criadas depois de substituí-lo. Por isso a aplicação é importada
 * dinamicamente, depois do `enableMocking`.
 */
// O CSS não depende dos mocks e carrega já, sem esperar a aplicação
import './index.css'

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  // Import dinâmico: sem mocks, o MSW não entra no bundle
  const { startMockWorker } = await import('../mocks/browser')
  await startMockWorker()
}

async function bootstrap() {
  await enableMocking()
  const { renderApp } = await import('./app/render')
  renderApp(document.getElementById('root')!)
}

void bootstrap()
