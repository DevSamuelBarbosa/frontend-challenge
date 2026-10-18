import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AccountLayout } from '@/features/account/components/account-layout'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { favoritesQueryOptions } from '@/queries/favorites'
import { QueryError } from '@/components/query-error'
import { StatePanel, stateActionClass } from '@/components/state-panel'
import { Heart } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/favorites')({
  component: FavoritesPage,
})

function FavoritesPage() {
  const { session } = Route.useRouteContext()
  const { data, isPending, isError, error, refetch } = useQuery(
    favoritesQueryOptions(session.user.id),
  )
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
          <QueryError
            subject="sua lista de interesse"
            message={error.message}
            onRetry={() => void refetch()}
          />
        ) : data.items.length === 0 ? (
          <StatePanel
            icon={Heart}
            title="Você ainda não favoritou nenhum NFT"
            description="Toque no coração de um NFT para guardá-lo aqui e acompanhar o preço."
          >
            <Link to="/" hash="mercado" className={stateActionClass}>
              Explorar o mercado
            </Link>
          </StatePanel>
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
