import { z } from 'zod'
import {
  ethAmountSchema,
  nftAvailabilitySchema,
  nftCategorySchema,
  nftFeedSchema,
  type NftListParams,
  nftSortSchema,
  networkSchema,
} from '@/api/contracts'

/** Grade 3×3 do design */
export const CATALOG_PAGE_SIZE = 9

export const catalogSearchDefaults = {
  sort: 'recent',
  availability: 'all',
  feed: 'all',
  page: 1,
} as const

/** Lista na URL: aceita `?category=music` e `?category=["music","games"]` */
function listParam<T extends z.ZodType>(item: T) {
  return z
    .preprocess((value) => (typeof value === 'string' ? [value] : value), z.array(item))
    .optional()
    .catch(undefined)
}

/**
 * Estado do catálogo na URL. Valores inválidos (ex.: `?page=abc`, categoria
 * desconhecida) caem no padrão em vez de quebrar a tela, para o acesso direto
 * a qualquer URL sempre funcionar.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  category: listParam(nftCategorySchema),
  network: listParam(networkSchema),
  minPrice: ethAmountSchema.optional().catch(undefined),
  maxPrice: ethAmountSchema.optional().catch(undefined),
  availability: nftAvailabilitySchema
    .default(catalogSearchDefaults.availability)
    .catch(catalogSearchDefaults.availability),
  feed: nftFeedSchema.default(catalogSearchDefaults.feed).catch(catalogSearchDefaults.feed),
  sort: nftSortSchema.default(catalogSearchDefaults.sort).catch(catalogSearchDefaults.sort),
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(catalogSearchDefaults.page)
    .catch(catalogSearchDefaults.page),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

const canonical = <T extends string>(values?: T[]) =>
  values?.length ? [...new Set(values)].sort() : undefined

/**
 * Converte o estado da URL nos parâmetros da API, de forma canônica: sem campos
 * vazios e com listas ordenadas. Assim, URLs equivalentes compartilham o cache.
 */
export function toNftListParams(search: CatalogSearch): NftListParams {
  return {
    q: search.q || undefined,
    category: canonical(search.category),
    network: canonical(search.network),
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    availability: search.availability === 'all' ? undefined : search.availability,
    feed: search.feed === 'all' ? undefined : search.feed,
    sort: search.sort,
    page: search.page,
    pageSize: CATALOG_PAGE_SIZE,
  }
}

/** Qualquer mudança de busca, filtro ou ordenação volta para a primeira página */
export function applyCatalogChange(
  current: CatalogSearch,
  change: Partial<Omit<CatalogSearch, 'page'>>,
): CatalogSearch {
  return { ...current, ...change, page: catalogSearchDefaults.page }
}
