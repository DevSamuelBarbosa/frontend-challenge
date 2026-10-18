import { http, HttpResponse } from 'msw'
import { quoteRequestSchema, type Quote } from '@/api/contracts'
import { eth, toEthAmount } from '@/lib/eth'
import { db } from '../db'
import {
  applyCoupon,
  buildLines,
  latestQuote,
  networkFee,
  QUOTE_TTL_MS,
  saveQuote,
} from '../lib/quote'
import { errorResponse, parseBody } from '../lib/responses'
import { requireSession } from '../lib/session'
import { apiUrl } from '../utils'

export const quoteHandlers = [
  /**
   * Gera uma nova cotação a partir do carrinho e do catálogo atual. As divergências
   * de preço são calculadas em relação à cotação anterior do mesmo usuário.
   */
  http.post(apiUrl('/quote'), async ({ request }) => {
    const { user } = requireSession(request)
    const body = await parseBody(request, quoteRequestSchema)

    if ((db.state.carts[user.id] ?? []).length === 0) {
      return errorResponse('validation_error', 'Seu carrinho está vazio', {
        details: { reason: 'empty_cart' },
      })
    }

    const { lines, issues } = buildLines(user.id, latestQuote(user.id))
    const subtotal = toEthAmount(lines.reduce((sum, line) => sum.plus(line.lineTotalEth), eth('0')))
    const { coupon, couponError, discount } = applyCoupon(body.couponCode, subtotal)
    const fee = networkFee(body.network, lines.length)
    const now = Date.now()

    const quote: Quote = {
      id: db.nextId('quote'),
      network: body.network,
      lines,
      coupon,
      couponError,
      issues,
      subtotalEth: subtotal,
      discountEth: discount,
      networkFeeEth: fee,
      totalEth: toEthAmount(eth(subtotal).minus(discount).plus(fee)),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
    }
    saveQuote({ ...quote, userId: user.id })
    return HttpResponse.json(quote)
  }),
]
