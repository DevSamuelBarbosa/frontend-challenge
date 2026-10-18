import type { Scenario } from './types'

const DEFAULT_PAYMENT = { outcome: 'confirmed', delayMs: 3000 } as const

/**
 * Cenários determinísticos. Ative com `?scenario=<nome>` na URL ou com
 * `window.__mocks.setScenario('<nome>')`. Ativar um cenário restaura o banco.
 */
export const scenarios = [
  {
    name: 'default',
    description: 'Tudo funciona, com latência curta e estável',
    latency: { min: 120, max: 320 },
  },
  {
    name: 'empty',
    description: 'Catálogo sem NFTs e usuários sem favoritos',
    latency: { min: 120, max: 320 },
    setup: (draft) => {
      draft.nfts = []
      for (const userId of Object.keys(draft.favorites)) draft.favorites[userId] = []
    },
  },
  {
    name: 'slow',
    description: 'Todas as respostas demoram 2,5 s (exibe os skeletons)',
    latency: 2500,
  },
  {
    name: 'variable-latency',
    description: 'Latência variável entre 200 ms e 2,5 s',
    latency: { min: 200, max: 2500 },
  },
  {
    name: 'out-of-order',
    description:
      'Consultas do catálogo alternam entre lenta e rápida: respostas chegam fora de ordem',
    latency: 100,
    rules: [{ method: 'GET', path: '/nfts', effect: { type: 'delay', ms: [1800, 150] } }],
  },
  {
    name: 'offline',
    description: 'Sem conexão: todas as requisições falham',
    latency: 300,
    rules: [{ path: '*', effect: { type: 'network_error' } }],
  },
  {
    name: 'server-error',
    description:
      'O catálogo responde 503 nas 6 primeiras consultas (as 3 tentativas da grade e do destaque) e depois se recupera',
    latency: 200,
    rules: [
      {
        method: 'GET',
        path: '/nfts*',
        times: 6,
        effect: {
          type: 'error',
          status: 503,
          code: 'server_error',
          message: 'Serviço temporariamente indisponível',
        },
      },
    ],
  },
  {
    name: 'server-down',
    description: 'Toda a API responde 500',
    latency: 200,
    rules: [
      {
        path: '*',
        effect: { type: 'error', status: 500, code: 'server_error', message: 'Erro interno' },
      },
    ],
  },
  {
    name: 'favorites-failure',
    description: 'Incluir ou remover favoritos falha com 500 (testa o rollback otimista)',
    latency: 300,
    rules: [
      {
        method: 'POST',
        path: '/favorites',
        effect: { type: 'error', status: 500, code: 'server_error', message: 'Falha ao salvar' },
      },
      {
        method: 'DELETE',
        path: '/favorites/:nftId',
        effect: { type: 'error', status: 500, code: 'server_error', message: 'Falha ao salvar' },
      },
    ],
  },
  {
    name: 'session-expiring',
    description: 'A sessão expira 30 s após o login',
    latency: { min: 120, max: 320 },
    sessionTtlMs: 30_000,
  },
  {
    name: 'forbidden',
    description: 'Consultar pedidos responde 403 (acesso não autorizado)',
    latency: 200,
    rules: [
      {
        method: 'GET',
        path: '/orders*',
        effect: {
          type: 'error',
          status: 403,
          code: 'forbidden',
          message: 'Você não tem permissão para acessar este recurso',
        },
      },
    ],
  },
  {
    name: 'price-change',
    description: 'O preço do primeiro item do carrinho sobe 2 s após a cotação',
    latency: { min: 120, max: 320 },
    triggers: [
      { method: 'POST', path: '/quote', delayMs: 2000, times: 1, action: 'price_increase' },
    ],
  },
  {
    name: 'sold-out',
    description: 'A edição do primeiro item do carrinho esgota 2 s após a cotação',
    latency: { min: 120, max: 320 },
    triggers: [{ method: 'POST', path: '/quote', delayMs: 2000, times: 1, action: 'sell_out' }],
  },
  {
    name: 'order-timeout',
    description: 'O pedido é criado, mas a primeira resposta excede o tempo limite',
    latency: { min: 120, max: 320 },
    rules: [
      { method: 'POST', path: '/orders', phase: 'after', times: 1, effect: { type: 'timeout' } },
    ],
  },
  {
    name: 'realtime-chaos',
    description: 'Eventos em tempo real chegam duplicados e seguidos de versões antigas',
    latency: { min: 120, max: 320 },
    realtime: { duplicate: true, stale: true },
  },
  {
    name: 'realtime-offline',
    description: 'O servidor de tempo real recusa conexões (a API REST funciona)',
    latency: { min: 120, max: 320 },
    realtime: { offline: true },
  },
  {
    name: 'wallet-rejected',
    description: 'O usuário recusa a conexão na carteira',
    latency: { min: 120, max: 320 },
    rules: [
      {
        method: 'POST',
        path: '/wallets/:walletId/connection',
        effect: {
          type: 'error',
          status: 403,
          code: 'forbidden',
          message: 'A conexão foi recusada na carteira',
          details: { reason: 'wallet_rejected' },
        },
      },
    ],
  },
  {
    name: 'payment-rejected',
    description: 'A carteira recusa o pagamento',
    latency: { min: 120, max: 320 },
    payment: { outcome: 'rejected', delayMs: 3000 },
  },
] satisfies Scenario[]

export type ScenarioName = (typeof scenarios)[number]['name']

export const DEFAULT_SCENARIO: ScenarioName = 'default'

export function findScenario(name: string): Scenario | undefined {
  return scenarios.find((s) => s.name === name)
}

export function paymentFor(scenario: Scenario) {
  return scenario.payment ?? DEFAULT_PAYMENT
}
