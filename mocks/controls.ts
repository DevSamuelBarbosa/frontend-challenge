import type { EthAmount } from '@/api/contracts'
import { db } from './db'
import { changePrice, setAvailability } from './lib/mutations'
import { settleOrder } from './lib/orders'
import { resetScenario, scenarioInfo, setScenario } from './scenarios/runtime'
import { realtimeControls } from './socket/server'

/**
 * Controles da API simulada, expostos em `window.__mocks` para demonstração,
 * depuração e testes E2E. Toda alteração passa pelo mesmo banco dos handlers.
 */
export const mockControls = {
  scenarios: scenarioInfo,
  setScenario,
  /** Restaura o banco e reaplica o cenário ativo */
  reset: resetScenario,

  /** Expira as sessões ativas (todas ou só as do usuário informado) */
  expireSessions(userId?: string) {
    db.update((draft) => {
      const past = new Date(Date.now() - 1000).toISOString()
      for (const session of draft.sessions) {
        if (!userId || session.userId === userId) session.expiresAt = past
      }
    })
  },

  changePrice: (nftId: string, priceEth: EthAmount, editionId?: string) =>
    changePrice(nftId, priceEth, editionId),

  setAvailability: (nftId: string, available: number, editionId?: string) =>
    setAvailability(nftId, available, editionId),

  realtime: realtimeControls,

  /** Finaliza imediatamente os pedidos pendentes com o resultado já decidido */
  async settlePendingOrders() {
    const pending = db.state.orders.filter((o) => o.status === 'pending')
    await Promise.all(pending.map((o) => settleOrder(o.id, { force: true })))
  },
}

export type MockControls = typeof mockControls
