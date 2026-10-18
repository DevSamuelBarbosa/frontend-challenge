import { z } from 'zod'
import {
  ethAmountSchema,
  nftAvailabilitySchema,
  nftCategorySchema,
  type NftListParams,
  nftSortSchema,
} from '@/api/contracts'

export const CATALOG_PAGE_SIZE = 12

export const catalogSearchDefaults = {
  sort: 'recent',
  availability: 'all',
  page: 1,
} as const

/**
 * Estado do catálogo na URL. Valores inválidos (ex.: `?page=abc`, categoria
 * desconhecida) caem no padrão em vez de quebrar a tela, para o acesso direto
 * a qualquer URL sempre funcionar.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  category: z
    .preprocess(
      // Aceita `?category=art` e `?category=["art","music"]`
      (value) => (typeof value === 'string' ? [value] : value),
      z.array(nftCategorySchema),
    )
    .optional()
    .catch(undefined),
  minPrice: ethAmountSchema.optional().catch(undefined),
  maxPrice: ethAmountSchema.optional().catch(undefined),
  availability: nftAvailabilitySchema
    .default(catalogSearchDefaults.availability)
    .catch(catalogSearchDefaults.availability),
  sort: nftSortSchema.default(catalogSearchDefaults.sort).catch(catalogSearchDefaults.sort),
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(catalogSearchDefaults.page)
    .catch(catalogSearchDefaults.page),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

/**
 * Converte o estado da URL nos parâmetros da API, de forma canônica: sem campos
 * vazios e com categorias ordenadas. Assim, URLs equivalentes compartilham o cache.
 */
export function toNftListParams(search: CatalogSearch): NftListParams {
  return {
    q: search.q || undefined,
    category: search.category?.length ? [...new Set(search.category)].sort() : undefined,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    availability: search.availability === 'all' ? undefined : search.availability,
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
