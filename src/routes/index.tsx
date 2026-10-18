import { useQuery } from '@tanstack/react-query'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import {
  catalogSearchDefaults,
  catalogSearchSchema,
  toNftListParams,
} from '@/features/catalog/search'
import { nftListQueryOptions } from '@/queries/nfts'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  // Valores padrão não aparecem na URL
  search: { middlewares: [stripSearchParams(catalogSearchDefaults)] },
  loaderDeps: ({ search }) => toNftListParams(search),
  // Pré-carrega sem bloquear a navegação: a tela mostra o skeleton enquanto isso
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListQueryOptions(deps))
  },
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  const { data, status, isPlaceholderData, error } = useQuery(
    nftListQueryOptions(toNftListParams(search)),
  )

  // Renderização provisória: a tela do Figma substitui esta lista
  return (
    <>
      <h1 className="text-2xl font-bold">Início</h1>
      <p aria-live="polite">
        {status === 'pending' && 'Carregando…'}
        {status === 'error' && `Erro: ${error.message}`}
        {status === 'success' &&
          `${data.total} NFTs · página ${data.page} de ${Math.max(data.totalPages, 1)}${isPlaceholderData ? ' · atualizando…' : ''}`}
      </p>
      <ul>
        {data?.items.map((nft) => (
          <li key={nft.id}>
            {nft.name} · {nft.priceEth} ETH
          </li>
        ))}
      </ul>
    </>
  )
}
