import type {
  Coupon,
  CouponError,
  EthAmount,
  Network,
  QuoteIssue,
  QuoteLine,
} from '@/api/contracts'
import { compareEth, eth, toEthAmount } from '@/lib/eth'
import { db, type MockQuote } from '../db'
import { findEdition, maxQuantity } from './catalog'

export const QUOTE_TTL_MS = 5 * 60 * 1000
const MAX_QUOTES_PER_USER = 20

/** Taxa de rede simulada: valor base + valor por linha do pedido */
const NETWORK_FEES: Record<Network, { base: EthAmount; perLine: EthAmount }> = {
  ethereum: { base: '0.0025', perLine: '0.0005' },
  polygon: { base: '0.00008', perLine: '0.00001' },
  base: { base: '0.0003', perLine: '0.00005' },
}

export function networkFee(network: Network, lines: number): EthAmount {
  if (lines === 0) return '0'
  const fee = NETWORK_FEES[network]
  return toEthAmount(eth(fee.base).plus(eth(fee.perLine).times(lines)))
}

/** Linhas cotadas a partir do carrinho e do catálogo atual, com as divergências encontradas */
export function buildLines(userId: string, previous: MockQuote | undefined) {
  const lines: QuoteLine[] = []
  const issues: QuoteIssue[] = []

  for (const item of db.state.carts[userId] ?? []) {
    const found = findEdition(db.state.nfts, item.nftId, item.editionId)
    if (!found) continue
    const { nft, edition } = found
    const max = maxQuantity(edition)

    if (max === 0) {
      issues.push({ type: 'sold_out', cartItemId: item.id })
      continue
    }

    const quantity = Math.min(item.quantity, max)
    if (quantity < item.quantity) {
      issues.push({
        type: 'quantity_reduced',
        cartItemId: item.id,
        requested: item.quantity,
        available: quantity,
      })
    }

    const previousLine = previous?.lines.find((l) => l.editionId === edition.id)
    if (previousLine && compareEth(previousLine.unitPriceEth, edition.priceEth) !== 0) {
      issues.push({
        type: 'price_changed',
        cartItemId: item.id,
        previousPriceEth: previousLine.unitPriceEth,
        currentPriceEth: edition.priceEth,
      })
    }

    lines.push({
      cartItemId: item.id,
      nftId: nft.id,
      editionId: edition.id,
      name: nft.name,
      editionName: edition.name,
      quantity,
      unitPriceEth: edition.priceEth,
      lineTotalEth: toEthAmount(eth(edition.priceEth).times(quantity)),
      nftVersion: nft.version,
    })
  }

  return { lines, issues }
}

/** Valida o cupom e calcula o desconto. Cupom com problema não impede a cotação. */
export function applyCoupon(
  code: string | undefined,
  subtotal: EthAmount,
): { coupon: Coupon | null; couponError: CouponError | null; discount: EthAmount } {
  const none = { coupon: null, couponError: null, discount: '0' }
  if (!code) return none

  const normalized = code.trim().toUpperCase()
  const found = db.state.coupons.find((c) => c.code === normalized)
  if (!found) {
    return {
      ...none,
      couponError: { code: normalized, reason: 'invalid', message: 'Cupom inválido' },
    }
  }
  if (Date.parse(found.expiresAt) <= Date.now()) {
    return {
      ...none,
      couponError: { code: normalized, reason: 'expired', message: 'Este cupom expirou' },
    }
  }
  if (compareEth(subtotal, found.minSubtotalEth) < 0) {
    return {
      ...none,
      couponError: {
        code: normalized,
        reason: 'not_applicable',
        message: `Válido para compras a partir de ${found.minSubtotalEth} ETH`,
      },
    }
  }

  const raw =
    found.type === 'percent' ? eth(subtotal).times(found.value).div(100) : eth(found.value)
  // O desconto nunca passa do subtotal
  const discount = raw.gt(subtotal) ? eth(subtotal) : raw
  const { code: couponCode, description, type, value } = found
  return {
    coupon: { code: couponCode, description, type, value },
    couponError: null,
    discount: toEthAmount(discount),
  }
}

export function saveQuote(quote: MockQuote) {
  db.update((draft) => {
    const others = draft.quotes.filter((q) => q.userId !== quote.userId)
    const mine = draft.quotes.filter((q) => q.userId === quote.userId)
    draft.quotes = [...others, ...mine.slice(-(MAX_QUOTES_PER_USER - 1)), quote]
  })
}

export function latestQuote(userId: string) {
  return db.state.quotes.findLast((q) => q.userId === userId)
}
