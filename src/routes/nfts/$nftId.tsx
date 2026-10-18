import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { isApiError } from '@/api/errors'
import { NotFound } from '@/components/not-found'
import { nftQueryOptions } from '@/queries/nfts'

export const Route = createFileRoute('/nfts/$nftId')({
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftQueryOptions(params.nftId))
  },
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { data: nft, status, error } = useQuery(nftQueryOptions(nftId))

  if (isApiError(error) && error.code === 'not_found') {
    return (
      <NotFound
        title="NFT não encontrado"
        description="Este NFT não existe ou não está mais disponível no marketplace."
      />
    )
  }

  // Renderização provisória: a tela do Figma substitui este conteúdo
  return (
    <>
      <h1 className="text-2xl font-bold">{nft?.name ?? 'Detalhes do NFT'}</h1>
      <p aria-live="polite">
        {status === 'pending' && 'Carregando…'}
        {status === 'error' && `Erro: ${error.message}`}
      </p>
      {nft && (
        <ul>
          {nft.editions.map((edition) => (
            <li key={edition.id}>
              {edition.name} · {edition.priceEth} ETH · {edition.available} disponíveis
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
