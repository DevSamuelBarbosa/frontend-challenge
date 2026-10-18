import { type Network, type Order, orderSchema, type QuoteLine } from '@/api/contracts'
import { compareEth } from '@/lib/eth'
import { db, type MockOrder, type MockQuote } from '../db'
import { findEdition, maxQuantity } from './catalog'
import { sha256 } from './crypto'
import { adjustAvailability } from './mutations'

type OrderListener = (order: MockOrder) => void
const orderListeners = new Set<OrderListener>()

/** Avisa quando um pedido é criado ou muda de estado (usado pelos eventos em tempo real) */
export function onOrderChanged(listener: OrderListener) {
  orderListeners.add(listener)
  return () => orderListeners.delete(listener)
}

export function notifyOrderChanged(order: MockOrder) {
  const snapshot = structuredClone(order)
  orderListeners.forEach((listener) => listener(snapshot))
}

const EXPLORERS: Record<Network, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  solana: 'https://solscan.io/tx/',
}

/** Valida contra o contrato e remove os campos internos do pedido antes de responder */
export function toOrder(order: MockOrder): Order {
  return orderSchema.parse(order)
}

/** Hash estável do corpo da requisição, independente da ordem das chaves */
export function fingerprint(value: unknown) {
  const stable = (input: unknown): unknown =>
    Array.isArray(input)
      ? input.map(stable)
      : input && typeof input === 'object'
        ? Object.fromEntries(
            Object.entries(input)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, stable(v)]),
          )
        : input
  return sha256(JSON.stringify(stable(value)))
}

export type QuoteChange =
  | { type: 'price_changed'; editionId: string; quotedPriceEth: string; currentPriceEth: string }
  | { type: 'availability_changed'; editionId: string; quoted: number; available: number }
  | { type: 'cart_changed'; editionId: string }
  | { type: 'coupon_expired'; code: string }

/** Compara a cotação com o catálogo e o carrinho atuais */
export function findQuoteChanges(quote: MockQuote): QuoteChange[] {
  const changes: QuoteChange[] = []
  const cart = db.state.carts[quote.userId] ?? []

  for (const line of quote.lines) {
    const found = findEdition(db.state.nfts, line.nftId, line.editionId)
    const cartItem = cart.find((i) => i.id === line.cartItemId)
    if (!found || !cartItem || cartItem.quantity < line.quantity) {
      changes.push({ type: 'cart_changed', editionId: line.editionId })
      continue
    }
    if (compareEth(found.edition.priceEth, line.unitPriceEth) !== 0) {
      changes.push({
        type: 'price_changed',
        editionId: line.editionId,
        quotedPriceEth: line.unitPriceEth,
        currentPriceEth: found.edition.priceEth,
      })
    }
    if (maxQuantity(found.edition) < line.quantity) {
      changes.push({
        type: 'availability_changed',
        editionId: line.editionId,
        quoted: line.quantity,
        available: found.edition.available,
      })
    }
  }

  if (quote.coupon) {
    const coupon = db.state.coupons.find((c) => c.code === quote.coupon?.code)
    if (!coupon || Date.parse(coupon.expiresAt) <= Date.now()) {
      changes.push({ type: 'coupon_expired', code: quote.coupon.code })
    }
  }
  return changes
}

/** Altera o estoque das edições do pedido (a versão dos NFTs é incrementada em `updateEditions`) */
function adjustStock(lines: QuoteLine[], direction: -1 | 1) {
  for (const line of lines)
    adjustAvailability(line.nftId, line.editionId, direction * line.quantity)
}

export const reserveStock = (lines: QuoteLine[]) => adjustStock(lines, -1)

/** Remove do carrinho apenas as quantidades compradas */
function removePurchasedFromCart(order: MockOrder) {
  db.update((draft) => {
    const cart = draft.carts[order.userId] ?? []
    for (const line of order.lines) {
      const item = cart.find((i) => i.editionId === line.editionId)
      if (item) item.quantity -= line.quantity
    }
    draft.carts[order.userId] = cart.filter((i) => i.quantity > 0)
  })
}

/**
 * Finaliza o pedido pendente quando chega a hora. Chamado ao consultar o pedido e
 * pelo timer, para o resultado sobreviver a refresh e reconexão.
 * Pedidos confirmados ou recusados são terminais.
 */
export async function settleOrder(orderId: string, options: { force?: boolean } = {}) {
  const order = db.state.orders.find((o) => o.id === orderId)
  if (!order || order.status !== 'pending') return order
  if (!options.force && Date.parse(order.resolveAt) > Date.now()) return order

  const transaction =
    order.outcome === 'confirmed'
      ? await sha256(`${order.id}:${order.idempotencyKey}`).then((hash) => ({
          hash: `0x${hash}`,
          explorerUrl: `${EXPLORERS[order.network]}0x${hash}`,
        }))
      : null

  // Revalida depois do await: outra chamada pode ter finalizado o pedido
  const current = db.state.orders.find((o) => o.id === orderId)
  if (!current || current.status !== 'pending') return current

  if (current.outcome === 'confirmed') {
    removePurchasedFromCart(current)
  } else {
    adjustStock(current.lines, 1)
  }

  db.update((draft) => {
    const target = draft.orders.find((o) => o.id === orderId)!
    target.status = current.outcome
    target.transaction = transaction
    target.rejectionReason =
      current.outcome === 'rejected' ? 'A carteira recusou a assinatura da transação' : null
    target.version += 1
    target.updatedAt = new Date().toISOString()
  })
  const settled = db.state.orders.find((o) => o.id === orderId)!
  notifyOrderChanged(settled)
  return settled
}

/** Agenda a finalização enquanto a página estiver aberta */
export function scheduleSettlement(order: MockOrder) {
  const delay = Math.max(0, Date.parse(order.resolveAt) - Date.now())
  setTimeout(() => void settleOrder(order.id), delay)
}

/** Ao carregar os mocks, retoma pedidos que ficaram pendentes antes do refresh */
export function resumePendingOrders() {
  db.state.orders.filter((o) => o.status === 'pending').forEach(scheduleSettlement)
}
