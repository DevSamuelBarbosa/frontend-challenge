import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { QuoteRequest } from '@/api/contracts'
import { createQuote } from '@/api/quote'
import { queryKeys } from './keys'

/**
 * Cotação do carrinho para a rede e o cupom escolhidos. É a referência de valores
 * do pedido. Fica desatualizada na hora (`staleTime: 0`): é refeita ao voltar à
 * tela, quando o carrinho muda e quando chega um `nft.updated` de um item.
 */
export const quoteQueryOptions = (userId: string, params: QuoteRequest) =>
  queryOptions({
    queryKey: queryKeys.user.quote(userId, params),
    queryFn: ({ signal }) => createQuote(params, signal),
    staleTime: 0,
    // Trocar cupom ou rede mantém o resumo anterior visível enquanto recalcula
    placeholderData: keepPreviousData,
  })
