import type { Nft, Order, Quote } from '@/api/contracts'
import type { MockCoupon, MockUser, MockWallet } from '../fixtures'

export interface MockSession {
  token: string
  userId: string
  createdAt: string
  expiresAt: string
}

/** Item do carrinho como fica guardado. Nome, preço e estoque vêm sempre do catálogo atual. */
export interface MockCartItem {
  id: string
  nftId: string
  editionId: string
  quantity: number
  addedAt: string
}

export interface MockQuote extends Quote {
  userId: string
}

export interface MockOrder extends Order {
  userId: string
  idempotencyKey: string
  /** Hash do corpo da requisição, para detectar reuso da chave com conteúdo diferente */
  requestFingerprint: string
  /** Resultado do pagamento simulado, decidido na criação */
  outcome: 'confirmed' | 'rejected'
  /** Momento em que o pedido pendente é finalizado com o resultado acima */
  resolveAt: string
}

export interface MockState {
  /** Versão do formato salvo. Ao mudar, o estado persistido é descartado. */
  schemaVersion: number
  sequence: number
  users: MockUser[]
  sessions: MockSession[]
  nfts: Nft[]
  favorites: Record<string, string[]>
  carts: Record<string, MockCartItem[]>
  quotes: MockQuote[]
  orders: MockOrder[]
  wallets: MockWallet[]
  coupons: MockCoupon[]
}
