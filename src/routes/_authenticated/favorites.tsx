import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { favoritesQueryOptions } from '@/queries/favorites'

export const Route = createFileRoute('/_authenticated/favorites')({
  component: FavoritesPage,
})

// Renderização provisória: a página final entra com a área da conta
function FavoritesPage() {
  const { session } = Route.useRouteContext()
  const { data, status } = useQuery(favoritesQueryOptions(session.user.id))

  return (
    <section className="page-container py-8">
      <h1 className="text-xl font-bold">Lista de interesse</h1>
      {status === 'pending' && <p aria-live="polite">Carregando…</p>}
      {data?.items.length === 0 && (
        <p className="mt-4 text-muted-foreground">Nenhum favorito ainda.</p>
      )}
      <ul className="mt-4 flex flex-col gap-2">
        {data?.items.map((nft) => (
          <li key={nft.id}>
            <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="hover:text-highlight">
              {nft.name} · {nft.priceEth} ETH
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
