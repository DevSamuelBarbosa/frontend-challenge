import { z } from 'zod'
import { ethAmountSchema, idSchema, imageSchema, isoDateSchema, paginatedSchema } from './common'

/*
 * GET /nfts?q&category&minPrice&maxPrice&availability&sort&page&pageSize -> Paginated<NftSummary>
 * GET /nfts/:nftId                                                       -> Nft (404 se não existir)
 */

export const nftCategorySchema = z.enum([
  'art',
  'collectibles',
  'music',
  'photography',
  'video',
  'utility',
  'sport',
  'virtual_worlds',
])
export type NftCategory = z.infer<typeof nftCategorySchema>

export const creatorSchema = z.object({
  id: idSchema,
  name: z.string(),
  avatarUrl: z.string().nullable(),
})
export type Creator = z.infer<typeof creatorSchema>

/** Cada NFT é vendido em edições, com preço e estoque próprios */
export const nftEditionSchema = z.object({
  id: idSchema,
  name: z.string(),
  priceEth: ethAmountSchema,
  available: z.number().int().nonnegative(),
  supply: z.number().int().positive(),
  /** Limite de unidades por pedido */
  maxPerOrder: z.number().int().positive(),
})
export type NftEdition = z.infer<typeof nftEditionSchema>

export const nftSchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string(),
  category: nftCategorySchema,
  creator: creatorSchema,
  images: z.array(imageSchema).min(1),
  editions: z.array(nftEditionSchema).min(1),
  tags: z.array(z.string()),
  favoritesCount: z.number().int().nonnegative(),
  /** Incrementada a cada alteração de preço ou disponibilidade */
  version: z.number().int().nonnegative(),
  createdAt: isoDateSchema,
})
export type Nft = z.infer<typeof nftSchema>

/** Versão resumida usada nos cards do catálogo */
export const nftSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  category: nftCategorySchema,
  creator: creatorSchema,
  image: imageSchema,
  /** Menor preço entre as edições disponíveis (ou entre todas, se esgotado) */
  priceEth: ethAmountSchema,
  available: z.number().int().nonnegative(),
  favoritesCount: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
  createdAt: isoDateSchema,
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const nftListSchema = paginatedSchema(nftSummarySchema)
export type NftList = z.infer<typeof nftListSchema>

export const nftSortSchema = z.enum(['recent', 'price_asc', 'price_desc', 'popular', 'name'])
export type NftSort = z.infer<typeof nftSortSchema>

export const nftAvailabilitySchema = z.enum(['all', 'available', 'sold_out'])
export type NftAvailability = z.infer<typeof nftAvailabilitySchema>

/** Parâmetros de busca do catálogo, compartilhados entre URL, query e API */
export const nftListParamsSchema = z.object({
  q: z.string().trim().optional(),
  category: z.array(nftCategorySchema).optional(),
  minPrice: ethAmountSchema.optional(),
  maxPrice: ethAmountSchema.optional(),
  availability: nftAvailabilitySchema.optional(),
  sort: nftSortSchema.optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(48).optional(),
})
export type NftListParams = z.infer<typeof nftListParamsSchema>
