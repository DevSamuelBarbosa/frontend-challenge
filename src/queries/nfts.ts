import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { NftListParams } from '@/api/contracts'
import { getNft, listNfts } from '@/api/nfts'
import { queryKeys } from './keys'

/**
 * Catálogo. Cada combinação de parâmetros tem a própria chave: uma resposta
 * atrasada de uma busca anterior só atualiza o cache daquela busca e nunca
 * aparece na tela atual. O `signal` cancela a requisição quando ela deixa de
 * ser necessária.
 */
export const nftListQueryOptions = (params: NftListParams) =>
  queryOptions({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => listNfts(params, signal),
    // Mantém a página anterior visível enquanto a nova carrega
    placeholderData: keepPreviousData,
  })

export const nftQueryOptions = (nftId: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.detail(nftId),
    queryFn: ({ signal }) => getNft(nftId, signal),
  })
