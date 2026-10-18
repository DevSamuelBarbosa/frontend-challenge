import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { useCallback } from 'react'
import { CatalogSearchBar, CatalogSection } from '@/features/catalog/components/catalog-section'
import { Hero } from '@/features/catalog/components/hero'
import { MintingJournal, PromoBanners } from '@/features/home/components/editorial-sections'
import {
  applyCatalogChange,
  type CatalogSearch,
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
  const navigate = Route.useNavigate()

  // Cada mudança vira uma entrada no histórico: voltar e avançar restauram o catálogo
  const onChange = useCallback(
    (change: Partial<Omit<CatalogSearch, 'page'>>) =>
      void navigate({
        search: (prev) => applyCatalogChange(prev, change),
        resetScroll: false,
      }),
    [navigate],
  )
  const onPageChange = useCallback(
    (page: number) => void navigate({ search: (prev) => ({ ...prev, page }), resetScroll: false }),
    [navigate],
  )
  const onClearFilters = useCallback(
    () =>
      void navigate({
        search: (prev) => ({ ...catalogSearchDefaults, feed: prev.feed, sort: prev.sort }),
        resetScroll: false,
      }),
    [navigate],
  )

  return (
    <>
      <div className="page-container pt-4 md:hidden">
        <CatalogSearchBar search={search} onChange={onChange} className="mb-0" />
      </div>
      <Hero />
      <CatalogSection
        search={search}
        onChange={onChange}
        onPageChange={onPageChange}
        onClearFilters={onClearFilters}
      />
      <PromoBanners />
      <MintingJournal />
    </>
  )
}
