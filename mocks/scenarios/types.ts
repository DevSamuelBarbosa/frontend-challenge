import type { ApiErrorCode } from '@/api/errors'
import type { MockState } from '../db'

export type ScenarioEffect =
  /** Resposta HTTP de erro no formato do contrato */
  | { type: 'error'; status: number; code: ApiErrorCode; message: string }
  /** Falha de conexão (o cliente não recebe resposta) */
  | { type: 'network_error' }
  /** Segura a resposta além do tempo limite do cliente */
  | { type: 'timeout' }
  /** Atraso extra. Com uma lista, cada requisição usa o próximo valor (em ciclo). */
  | { type: 'delay'; ms: number | number[] }

export interface ScenarioRule {
  /** Método HTTP. Omitido: qualquer método. */
  method?: string
  /** Caminho relativo à API. `*` casa qualquer trecho e `:param` um segmento. */
  path: string
  /**
   * `before`: aplica antes do handler (a operação não acontece).
   * `after`: o handler executa e só então o efeito é aplicado, ex.: o pedido é
   * criado, mas a resposta se perde.
   */
  phase?: 'before' | 'after'
  /** Aplica só nas primeiras N requisições que casarem. Omitido: sempre. */
  times?: number
  effect: ScenarioEffect
}

/** Alteração no catálogo disparada depois de uma requisição, ex.: preço muda após a cotação */
export interface ScenarioTrigger {
  method: string
  path: string
  /** Tempo após a resposta até a alteração acontecer */
  delayMs: number
  times?: number
  action: 'price_increase' | 'sell_out'
}

export interface Scenario {
  name: string
  description: string
  /** Latência base de todas as requisições: fixa ou faixa (sorteio determinístico) */
  latency: number | { min: number; max: number }
  rules?: ScenarioRule[]
  triggers?: ScenarioTrigger[]
  payment?: { outcome: 'confirmed' | 'rejected'; delayMs: number }
  sessionTtlMs?: number
  /** Comportamento do canal em tempo real */
  realtime?: {
    /** Cada evento é entregue duas vezes */
    duplicate?: boolean
    /** Depois de cada evento, reenvia o evento anterior do mesmo recurso (versão antiga) */
    stale?: boolean
    /** Recusa conexões, simulando o servidor de tempo real fora do ar */
    offline?: boolean
  }
  /** Ajustes no banco aplicados ao ativar o cenário (depois do reset) */
  setup?: (draft: MockState) => void
}
