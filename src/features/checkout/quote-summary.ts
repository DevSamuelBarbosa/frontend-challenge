import type { Quote } from '@/api/contracts'

/**
 * Resumo comparável da cotação: cada nova cotação tem outro id, então o que
 * importa para exigir nova confirmação são os valores, itens e cupom.
 */
export function quoteSummary(quote: Quote) {
  return JSON.stringify({
    network: quote.network,
    lines: quote.lines.map((l) => [l.editionId, l.quantity, l.unitPriceEth]),
    coupon: quote.coupon?.code ?? null,
    subtotal: quote.subtotalEth,
    discount: quote.discountEth,
    fee: quote.networkFeeEth,
    total: quote.totalEth,
  })
}

/** Cotação que não pode ser confirmada como está (itens esgotados ou reduzidos) */
export function hasBlockingIssues(quote: Quote) {
  return quote.issues.some((issue) => issue.type !== 'price_changed') || quote.lines.length === 0
}
