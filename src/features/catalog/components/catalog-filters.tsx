import { useState } from 'react'
import type { EthAmount, Network, NftCategory, NftFacets } from '@/api/contracts'
import { nftCategorySchema, networkSchema } from '@/api/contracts'
import { Slider } from '@/components/ui/slider'
import { formatPriceRange } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CATEGORY_LABELS, NETWORK_LABELS } from '../labels'
import type { CatalogSearch } from '../search'

interface CatalogFiltersProps {
  search: CatalogSearch
  facets: NftFacets | undefined
  onChange: (change: Partial<Omit<CatalogSearch, 'page'>>) => void
}

/** Filtros do catálogo: coleções, faixa de preço e rede. Combináveis entre si. */
export function CatalogFilters({ search, facets, onChange }: CatalogFiltersProps) {
  return (
    <div className="flex flex-col gap-8">
      <FilterGroup title="Coleções">
        {nftCategorySchema.options.map((category) => (
          <FilterOption
            key={category}
            label={CATEGORY_LABELS[category]}
            count={facets?.categories[category]}
            selected={search.category?.includes(category) ?? false}
            emphasizeCount
            onToggle={() => onChange({ category: toggle(search.category, category) })}
          />
        ))}
      </FilterGroup>

      {/* A `key` reinicia o controle quando o filtro aplicado muda por fora (ex.: histórico) */}
      <PriceFilter
        key={`${search.minPrice}-${search.maxPrice}-${facets?.priceRange.max}`}
        search={search}
        facets={facets}
        onChange={onChange}
      />

      <FilterGroup title="Rede">
        {networkSchema.options.map((network) => (
          <FilterOption
            key={network}
            label={NETWORK_LABELS[network]}
            count={facets?.networks[network]}
            selected={search.network?.includes(network) ?? false}
            onToggle={() => onChange({ network: toggle(search.network, network) })}
          />
        ))}
      </FilterGroup>
    </div>
  )
}

function toggle<T extends NftCategory | Network>(list: T[] | undefined, value: T) {
  const next = list?.includes(value)
    ? list.filter((item) => item !== value)
    : [...(list ?? []), value]
  return next.length > 0 ? next : undefined
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-lg font-bold">{title}</legend>
      <ul className="mt-3 flex flex-col gap-1">{children}</ul>
    </fieldset>
  )
}

function FilterOption({
  label,
  count,
  selected,
  emphasizeCount,
  onToggle,
}: {
  label: string
  count: number | undefined
  selected: boolean
  emphasizeCount?: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[0.9375rem] transition-colors hover:bg-band',
          selected ? 'text-highlight' : 'text-muted-foreground',
        )}
      >
        <span>
          {selected && <span className="sr-only">Selecionado: </span>}
          {label}
        </span>
        <span className={cn(emphasizeCount && 'font-bold')}>
          {count === undefined ? '' : `(${count})`}
          <span className="sr-only"> NFTs</span>
        </span>
      </button>
    </li>
  )
}

const toNumber = (value: EthAmount) => Number(value)
const toAmount = (value: number) => value.toFixed(2)

/**
 * Faixa de preço com controle de duas alças. A escolha só vale ao clicar em
 * "Aplicar", para não disparar uma consulta a cada movimento.
 */
function PriceFilter({ search, facets, onChange }: CatalogFiltersProps) {
  const limits = facets?.priceRange
  const min = limits ? toNumber(limits.min) : 0
  const max = limits ? toNumber(limits.max) : 0
  const applied: [number, number] = [
    search.minPrice ? toNumber(search.minPrice) : min,
    search.maxPrice ? toNumber(search.maxPrice) : max,
  ]
  const [range, setRange] = useState(applied)

  return (
    <fieldset>
      <legend className="text-lg font-bold">Faixa de preço</legend>
      <Slider
        className="mt-4 px-3"
        min={min}
        max={max}
        step={0.01}
        value={range}
        disabled={!limits}
        minStepsBetweenThumbs={1}
        onValueChange={(value) => setRange([value[0], value[1]])}
        aria-label="Faixa de preço"
        thumbLabels={['Preço mínimo', 'Preço máximo']}
      />
      <p className="mt-4 px-3 text-sm" aria-live="polite">
        Preço: {limits ? formatPriceRange(toAmount(range[0]), toAmount(range[1])) : 'carregando…'}
      </p>
      <button
        type="button"
        onClick={() =>
          onChange({
            minPrice: range[0] > min ? toAmount(range[0]) : undefined,
            maxPrice: range[1] < max ? toAmount(range[1]) : undefined,
          })
        }
        className="mt-3 ml-3 rounded-md bg-primary px-3 py-1.5 text-[0.9375rem] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Aplicar
      </button>
    </fieldset>
  )
}
