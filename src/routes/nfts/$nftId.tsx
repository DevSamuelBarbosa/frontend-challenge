import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { isApiError } from '@/api/errors'
import { NotFound } from '@/components/not-found'
import { QueryError } from '@/components/query-error'
import { NftDetail, NftDetailSkeleton } from '@/features/nft/components/nft-detail'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { nftQueryOptions } from '@/queries/nfts'

export const Route = createFileRoute('/nfts/$nftId')({
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftQueryOptions(params.nftId))
  },
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { data: nft, status, error, refetch } = useQuery(nftQueryOptions(nftId))
  useDocumentTitle(nft?.name ?? (status === 'pending' ? 'Carregando NFT' : undefined))

  if (isApiError(error) && error.code === 'not_found') {
    return (
      <NotFound
        title="NFT não encontrado"
        description="Este NFT não existe ou não está mais disponível no marketplace."
      />
    )
  }

  if (status === 'error') {
    return (
      <QueryError
        subject="o NFT"
        message={error.message}
        onRetry={() => void refetch()}
        size="page"
      />
    )
  }

  if (status === 'pending') return <NftDetailSkeleton />

  // A `key` reinicia edição e quantidade ao navegar para outro NFT
  return <NftDetail key={nft.id} nft={nft} />
}
