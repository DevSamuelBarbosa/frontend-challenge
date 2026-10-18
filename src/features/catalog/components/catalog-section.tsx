import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { nftListQueryOptions } from '@/queries/nfts'
import { CATALOG_PAGE_SIZE, type CatalogSearch, toNftListParams } from '../search'
import { CatalogFilters } from './catalog-filters'
import { FeedTabs, SortSelect } from './catalog-toolbar'
import { FeaturedCard } from './featured-card'
import { NftCard, NftCardSkeleton } from './nft-card'
import { Pagination } from './pagination'

/** Atraso da busca digitada no mobile, para não consultar a cada tecla */
const SEARCH_DEBOUNCE_MS = 350

interface CatalogSectionProps {
  search: CatalogSearch
  /** Mudança de busca, filtro, aba ou ordenação: volta para a página 1 */
  onChange: (change: Partial<Omit<CatalogSearch, 'page'>>) => void
  onPageChange: (page: number) => void
  onClearFilters: () => void
}

export function CatalogSection({
  search,
  onChange,
  onPageChange,
  onClearFilters,
}: CatalogSectionProps) {
  const { data, status, error, isPlaceholderData, isFetching, refetch } = useQuery(
    nftListQueryOptions(toNftListParams(search)),
  )
  const sectionRef = useRef<HTMLElement>(null)
  const updating = isPlaceholderData && isFetching
  const hasFilters = Boolean(
    search.q || search.category || search.network || search.minPrice || search.maxPrice,
  )

  function changePage(page: number) {
    onPageChange(page)
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section
      ref={sectionRef}
      id="mercado"
      aria-labelledby="catalog-title"
      className="page-container mt-8 scroll-mt-4 md:mt-16"
    >
      <h2 id="catalog-title" className="sr-only">
        Catálogo de NFTs
      </h2>

      {/* No celular a busca fica no topo da página; no tablet, junto ao catálogo */}
      <CatalogSearchBar search={search} onChange={onChange} className="hidden md:flex lg:hidden" />

      <div className="grid gap-12 lg:grid-cols-[19.375rem_1fr]">
        <aside aria-label="Filtros" className="hidden flex-col gap-6 lg:flex">
          <div className="bg-card px-5 py-6">
            <CatalogFilters search={search} facets={data?.facets} onChange={onChange} />
          </div>
          <FeaturedCard />
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <FeedTabs
              feed={search.feed}
              onChange={(feed) => onChange({ feed })}
              className="max-w-full overflow-x-auto"
            />
            <div className="hidden md:block">
              <SortSelect sort={search.sort} onChange={(sort) => onChange({ sort })} />
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            {status === 'success' &&
              (updating ? 'Atualizando resultados…' : `${data.total} NFTs encontrados`)}
          </p>

          {status === 'error' ? (
            <div role="alert" className="mt-12 flex flex-col items-start gap-4 bg-card p-6">
              <p className="font-bold">Não foi possível carregar o catálogo.</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground"
              >
                Tentar novamente
              </button>
            </div>
          ) : status === 'success' && data.items.length === 0 ? (
            <div className="mt-12 flex flex-col items-start gap-4 bg-card p-6">
              <p className="font-bold">Nenhum NFT encontrado.</p>
              <p className="text-sm text-muted-foreground">
                Tente outra busca ou remova alguns filtros.
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <ul
              aria-busy={status === 'pending' || updating}
              className={cn(
                'mt-6 grid grid-cols-2 gap-x-3 gap-y-6 transition-opacity md:grid-cols-3 md:gap-x-6 md:gap-y-16 lg:gap-x-[2.125rem]',
                updating && 'opacity-60',
              )}
            >
              {status === 'pending'
                ? Array.from({ length: CATALOG_PAGE_SIZE }, (_, i) => (
                    <li key={i} className={staggered(i)}>
                      <NftCardSkeleton />
                    </li>
                  ))
                : data.items.map((nft, i) => (
                    <li key={nft.id} className={staggered(i)}>
                      <NftCard nft={nft} priority={i < 3} />
                    </li>
                  ))}
            </ul>
          )}

          {data && data.items.length > 0 && (
            <div className="mt-12 md:mt-16">
              <Pagination page={data.page} totalPages={data.totalPages} onChange={changePage} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/** No mobile, a coluna da direita desce um pouco, como no design */
const staggered = (index: number) => (index % 2 === 1 ? 'max-md:translate-y-8' : undefined)

/** Busca e filtros do mobile e tablet: os filtros abrem em uma gaveta */
export function CatalogSearchBar({
  search,
  onChange,
  className,
}: Pick<CatalogSectionProps, 'search' | 'onChange'> & { className?: string }) {
  // Mesma consulta da grade (mesma chave): só lê as contagens dos filtros do cache
  const { data } = useQuery(nftListQueryOptions(toNftListParams(search)))
  const facets = data?.facets
  const urlTerm = search.q ?? ''
  const [term, setTerm] = useState(urlTerm)
  const [applied, setApplied] = useState(urlTerm)

  // A busca mudou por fora (busca do header, voltar do navegador): o campo acompanha
  if (urlTerm !== applied) {
    setApplied(urlTerm)
    setTerm(urlTerm)
  }

  // Busca enquanto digita, com atraso
  useEffect(() => {
    const next = term.trim()
    if (next === applied) return
    const timer = setTimeout(() => {
      setApplied(next)
      onChange({ q: next || undefined })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term, applied, onChange])

  return (
    <div className={cn('mb-6 flex gap-2', className)}>
      <div role="search" className="relative flex-1">
        <label htmlFor="catalog-search" className="sr-only">
          Buscar NFTs, criadores ou atributos
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          id="catalog-search"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Explorar coleções"
          className="h-11 w-full rounded-xl bg-card pr-3 pl-10 text-sm placeholder:text-muted-foreground"
        />
      </div>
      <Sheet>
        <SheetTrigger
          className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"
          aria-label="Filtros e ordenação"
        >
          <SlidersHorizontal className="size-5" aria-hidden />
        </SheetTrigger>
        <SheetContent side="right" className="w-[min(22rem,90vw)] overflow-y-auto px-5 py-6">
          <SheetHeader className="p-0">
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>Os resultados são atualizados a cada escolha.</SheetDescription>
          </SheetHeader>
          <SortSelect sort={search.sort} onChange={(sort) => onChange({ sort })} />
          <CatalogFilters search={search} facets={facets} onChange={onChange} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
