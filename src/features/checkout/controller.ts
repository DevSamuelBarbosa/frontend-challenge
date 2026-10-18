import type { QueryClient } from '@tanstack/react-query'
import type { CreateOrderRequest, Order, Quote } from '@/api/contracts'
import { ApiError, isApiError } from '@/api/errors'
import { queryKeys } from '@/queries/keys'
import { createOrderMutationOptions } from '@/queries/orders'
import { quoteQueryOptions } from '@/queries/quote'
import { hasBlockingIssues, quoteSummary } from './quote-summary'
import type { CheckoutStore } from './store'

export type ConfirmResult =
  | { type: 'order'; order: Order }
  /** Valores ou disponibilidade mudaram: o usuário precisa revisar e confirmar de novo */
  | { type: 'changed'; quote: Quote }
  | { type: 'error'; error: ApiError }

interface ControllerOptions {
  queryClient: QueryClient
  userId: string
  store: CheckoutStore
}

/**
 * Regras do pagamento, independentes da interface:
 * - a revisão registra os valores aceitos pelo usuário;
 * - antes de enviar, a cotação é refeita e qualquer mudança exige nova confirmação;
 * - o pedido é enviado com uma chave de idempotência gravada antes do envio, e
 *   uma tentativa sem resposta é sempre reenviada com a mesma chave e o mesmo corpo.
 */
export function createCheckoutController({ queryClient, userId, store }: ControllerOptions) {
  const quoteParams = () => {
    const { network, couponCode } = store.get().draft
    return { network, couponCode: couponCode ?? undefined }
  }

  /** Cotação nova, ignorando o cache */
  async function fetchFreshQuote() {
    const options = quoteQueryOptions(userId, quoteParams())
    await queryClient.cancelQueries({ queryKey: options.queryKey, exact: true })
    return queryClient.fetchQuery({ ...options, staleTime: 0 })
  }

  /** O usuário revisou estes valores e aceita seguir com eles */
  function accept(quote: Quote) {
    store.update((s) => ({ ...s, acceptedQuote: quoteSummary(quote) }))
  }

  async function send(body: CreateOrderRequest, idempotencyKey: string): Promise<ConfirmResult> {
    const mutation = queryClient
      .getMutationCache()
      .build(queryClient, createOrderMutationOptions(queryClient, userId))
    try {
      const order = await mutation.execute({ body, idempotencyKey })
      store.update((s) => ({
        ...s,
        attempt: s.attempt && { ...s.attempt, orderId: order.id },
      }))
      return { type: 'order', order }
    } catch (cause) {
      const error = isApiError(cause)
        ? cause
        : new ApiError({ code: 'unknown', message: 'Não foi possível enviar o pedido', cause })

      // Sem resposta definitiva (timeout, rede, 5xx): a tentativa é mantida para o
      // reenvio usar a mesma chave. Recusas definitivas encerram a tentativa.
      if (!error.isRetryable) store.update((s) => ({ ...s, attempt: null }))

      if (error.code === 'conflict' && error.details.reason === 'quote_outdated') {
        store.update((s) => ({ ...s, acceptedQuote: null }))
        return { type: 'changed', quote: await fetchFreshQuote() }
      }
      return { type: 'error', error }
    }
  }

  let confirming: Promise<ConfirmResult> | null = null

  /** Cliques repetidos enquanto uma confirmação está em andamento recebem o mesmo resultado */
  function confirm(): Promise<ConfirmResult> {
    confirming ??= runConfirm().finally(() => {
      confirming = null
    })
    return confirming
  }

  async function runConfirm(): Promise<ConfirmResult> {
    const { attempt, draft, acceptedQuote } = store.get()

    // Tentativa anterior sem resposta: reenvia exatamente o mesmo pedido
    if (attempt && !attempt.orderId) return send(attempt.body, attempt.idempotencyKey)

    if (!draft.walletId) {
      return {
        type: 'error',
        error: new ApiError({
          code: 'validation_error',
          message: 'Selecione uma carteira',
          fields: { walletId: 'Selecione uma carteira' },
        }),
      }
    }

    // Revalida preço, disponibilidade, cupom e taxas antes de enviar
    const quote = await fetchFreshQuote()
    if (hasBlockingIssues(quote) || quoteSummary(quote) !== acceptedQuote) {
      store.update((s) => ({ ...s, acceptedQuote: null }))
      return { type: 'changed', quote }
    }

    const body: CreateOrderRequest = {
      quoteId: quote.id,
      walletId: draft.walletId,
      network: draft.network,
      collector: draft.collector,
    }
    const idempotencyKey = crypto.randomUUID()
    // Gravada antes do envio: um refresh no meio da requisição não perde a chave
    store.update((s) => ({ ...s, attempt: { idempotencyKey, body, orderId: null } }))
    return send(body, idempotencyKey)
  }

  /** Pedido recusado: libera uma nova tentativa (com outra chave) */
  function discardAttempt() {
    store.update((s) => ({ ...s, attempt: null, acceptedQuote: null }))
  }

  /** Pedido confirmado: o checkout termina e o carrinho e a cotação são atualizados */
  function complete() {
    store.clear()
    void queryClient.invalidateQueries({ queryKey: queryKeys.user.cart(userId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.user.quote(userId) })
  }

  return { accept, confirm, discardAttempt, complete, fetchFreshQuote }
}

export type CheckoutController = ReturnType<typeof createCheckoutController>
