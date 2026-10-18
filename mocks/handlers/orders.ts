import { HttpResponse } from 'msw'
import { createOrderRequestSchema, orderStatusSchema } from '@/api/contracts'
import { db, type MockOrder } from '../db'
import { api } from '../lib/http'
import {
  findQuoteChanges,
  fingerprint,
  notifyOrderChanged,
  reserveStock,
  scheduleSettlement,
  settleOrder,
  toOrder,
} from '../lib/orders'
import { errorResponse, parseBody } from '../lib/responses'
import { requireSession } from '../lib/session'
import { paymentFor } from '../scenarios/definitions'
import { activeScenario } from '../scenarios/runtime'

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,128}$/

export const orderHandlers = [
  api.post('/orders', async ({ request }) => {
    const { user } = requireSession(request)
    const key = request.headers.get('Idempotency-Key')
    if (!key || !IDEMPOTENCY_KEY.test(key)) {
      return errorResponse('validation_error', 'Cabeçalho Idempotency-Key ausente ou inválido')
    }
    const body = await parseBody(request, createOrderRequestSchema)
    const requestFingerprint = await fingerprint(body)

    // A partir daqui não há mais await até gravar o pedido: requisições
    // simultâneas com a mesma chave não conseguem criar dois pedidos.
    const existing = db.state.orders.find((o) => o.userId === user.id && o.idempotencyKey === key)
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        return errorResponse('conflict', 'Esta tentativa de pedido já foi usada com outros dados', {
          details: { reason: 'idempotency_key_reused' },
        })
      }
      // Mesma tentativa: devolve o pedido já criado
      return HttpResponse.json(toOrder(existing), { headers: { 'Idempotent-Replayed': 'true' } })
    }

    const quote = db.state.quotes.find((q) => q.id === body.quoteId && q.userId === user.id)
    if (!quote) return errorResponse('not_found', 'Cotação não encontrada')
    if (Date.parse(quote.expiresAt) <= Date.now()) {
      return errorResponse('conflict', 'A cotação expirou. Revise o pedido novamente.', {
        details: { reason: 'quote_expired' },
      })
    }
    if (quote.network !== body.network) {
      return errorResponse('validation_error', 'A rede não corresponde à cotação', {
        fields: { network: 'Gere uma nova cotação para esta rede' },
      })
    }
    if (quote.lines.length === 0) {
      return errorResponse('validation_error', 'Não há itens disponíveis para comprar', {
        details: { reason: 'empty_quote' },
      })
    }

    const wallet = db.state.wallets.find((w) => w.id === body.walletId && w.userId === user.id)
    if (!wallet) {
      return errorResponse('validation_error', 'Carteira não encontrada', {
        fields: { walletId: 'Selecione uma carteira cadastrada' },
      })
    }
    if (!wallet.networks.includes(body.network)) {
      return errorResponse('validation_error', 'A carteira não suporta a rede selecionada', {
        fields: { walletId: 'Esta carteira não está habilitada para a rede escolhida' },
      })
    }

    const changes = findQuoteChanges(quote)
    if (changes.length > 0) {
      return errorResponse(
        'conflict',
        'Os valores ou a disponibilidade mudaram. Revise e confirme novamente.',
        { details: { reason: 'quote_outdated', changes } },
      )
    }

    // O resultado do pagamento é decidido agora e guardado, para sobreviver a refresh
    const payment = paymentFor(activeScenario())
    const now = Date.now()
    const order: MockOrder = {
      id: db.nextId('order'),
      status: 'pending',
      network: body.network,
      collector: body.collector,
      wallet: {
        id: wallet.id,
        label: wallet.label,
        provider: wallet.provider,
        address: wallet.address,
      },
      // Snapshot da cotação: o recibo não muda com alterações futuras no catálogo
      lines: structuredClone(quote.lines),
      coupon: quote.coupon,
      subtotalEth: quote.subtotalEth,
      discountEth: quote.discountEth,
      networkFeeEth: quote.networkFeeEth,
      totalEth: quote.totalEth,
      transaction: null,
      rejectionReason: null,
      version: 1,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      userId: user.id,
      idempotencyKey: key,
      requestFingerprint,
      outcome: payment.outcome,
      resolveAt: new Date(now + payment.delayMs).toISOString(),
    }
    db.update((draft) => {
      draft.orders.push(order)
    })
    // O estoque fica reservado enquanto o pagamento está pendente
    reserveStock(order.lines)
    scheduleSettlement(order)
    notifyOrderChanged(order)

    return HttpResponse.json(toOrder(order), { status: 201 })
  }),

  api.get('/orders', async ({ request }) => {
    const { user } = requireSession(request)
    const status = new URL(request.url).searchParams.get('status')
    const parsedStatus = status ? orderStatusSchema.safeParse(status) : null
    if (parsedStatus && !parsedStatus.success) {
      return errorResponse('validation_error', 'Status inválido')
    }

    const mine = db.state.orders.filter((o) => o.userId === user.id)
    await Promise.all(mine.map((o) => settleOrder(o.id)))
    const orders = db.state.orders
      .filter((o) => o.userId === user.id)
      .filter((o) => !parsedStatus || o.status === parsedStatus.data)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toOrder)
    return HttpResponse.json(orders)
  }),

  api.get('/orders/:orderId', async ({ request, params }) => {
    const { user } = requireSession(request)
    const order = db.state.orders.find((o) => o.id === params.orderId && o.userId === user.id)
    if (!order) return errorResponse('not_found', 'Pedido não encontrado')
    const settled = await settleOrder(order.id)
    return HttpResponse.json(toOrder(settled ?? order))
  }),
]
