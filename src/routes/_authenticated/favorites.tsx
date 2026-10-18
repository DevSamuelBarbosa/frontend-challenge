import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AccountLayout } from '@/features/account/components/account-layout'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { favoritesQueryOptions } from '@/queries/favorites'

export const Route = createFileRoute('/_authenticated/favorites')({
  component: FavoritesPage,
})

function FavoritesPage() {
  const { session } = Route.useRouteContext()
  const { data, isPending, isError, refetch } = useQuery(favoritesQueryOptions(session.user.id))
  useDocumentTitle('Lista de interesse')

  return (
    <AccountLayout section="favorites">
      <h1 className="text-base font-bold">Lista de interesse</h1>

      <div className="mt-6">
        {isPending ? (
          <ul
            aria-busy="true"
            aria-label="Carregando favoritos"
            className="grid grid-cols-2 gap-4 lg:grid-cols-3"
          >
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i}>
                <NftCardSkeleton />
              </li>
            ))}
          </ul>
        ) : isError ? (
          <div role="alert" className="text-sm">
            <p>Não foi possível carregar sua lista de interesse.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 font-bold text-highlight underline underline-offset-2"
            >
              Tentar novamente
            </button>
          </div>
        ) : data.items.length === 0 ? (
          <div className="text-sm">
            <p>Você ainda não favoritou nenhum NFT.</p>
            <Link
              to="/"
              hash="mercado"
              className="mt-2 inline-block font-bold text-highlight underline underline-offset-2"
            >
              Explorar o mercado
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {data.items.map((nft) => (
              <li key={nft.id}>
                <NftCard nft={nft} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AccountLayout>
  )
}
