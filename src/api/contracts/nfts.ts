import { z } from 'zod'
import {
  ethAmountSchema,
  idSchema,
  imageSchema,
  isoDateSchema,
  networkSchema,
  paginatedSchema,
} from './common'

/*
 * GET /nfts?q&category&network&minPrice&maxPrice&availability&feed&featured&sort&page&pageSize
 *        -> NftList (página + contagens por coleção e rede para os filtros)
 * GET /nfts/:nftId -> Nft (404 se não existir)
 */

/** Coleções exibidas no filtro do catálogo */
export const nftCategorySchema = z.enum([
  'digital_art',
  'photography',
  'music',
  'art_3d',
  'collectibles',
  'generative',
  'games',
  'subscriptions',
  'utility',
])
export type NftCategory = z.infer<typeof nftCategorySchema>

export const nftRaritySchema = z.enum(['common', 'rare'])
export type NftRarity = z.infer<typeof nftRaritySchema>

export const creatorSchema = z.object({
  id: idSchema,
  name: z.string(),
  avatarUrl: z.string().nullable(),
})
export type Creator = z.infer<typeof creatorSchema>

/**
 * Cada NFT é vendido em edições (1/1, 1/10, 1/50 ou aberta), com preço e
 * estoque próprios. Edição aberta não tem tiragem máxima (`supply: null`).
 */
export const nftEditionSchema = z.object({
  id: idSchema,
  name: z.string(),
  priceEth: ethAmountSchema,
  /** Preço anterior, exibido riscado quando a edição está em oferta */
  compareAtPriceEth: ethAmountSchema.nullable(),
  available: z.number().int().nonnegative(),
  supply: z.number().int().positive().nullable(),
  /** Limite de unidades por pedido */
  maxPerOrder: z.number().int().positive(),
})
export type NftEdition = z.infer<typeof nftEditionSchema>

export const nftReviewSchema = z.object({
  id: idSchema,
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: isoDateSchema,
})
export type NftReview = z.infer<typeof nftReviewSchema>

export const nftRatingSchema = z.object({
  average: z.number().min(0).max(5),
  count: z.number().int().nonnegative(),
})
export type NftRating = z.infer<typeof nftRatingSchema>

export const nftSchema = z.object({
  id: idSchema,
  name: z.string(),
  /** Número do token exibido como "ID do token: #0042" */
  tokenId: z.string(),
  description: z.string(),
  /** Texto longo da aba "Detalhes do NFT" (parágrafos) */
  details: z.array(z.string()),
  category: nftCategorySchema,
  /** Série à qual o NFT pertence, ex.: "Kurio Apes" */
  collectionName: z.string(),
  network: networkSchema,
  contract: z.object({
    address: z.string(),
    standard: z.string(),
    royaltyPercent: z.number().nonnegative(),
  }),
  attributes: z.array(z.string()),
  rarity: nftRaritySchema,
  featured: z.boolean(),
  creator: creatorSchema,
  images: z.array(imageSchema).min(1),
  editions: z.array(nftEditionSchema).min(1),
  tags: z.array(z.string()),
  rating: nftRatingSchema,
  reviews: z.array(nftReviewSchema),
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
  network: networkSchema,
  rarity: nftRaritySchema,
  creator: creatorSchema,
  image: imageSchema,
  /** Menor preço entre as edições disponíveis (ou entre todas, se esgotado) */
  priceEth: ethAmountSchema,
  /** Preço anterior da edição exibida, quando em oferta */
  compareAtPriceEth: ethAmountSchema.nullable(),
  /** Edição do preço exibido, usada pelo "adicionar ao carrinho" do card */
  defaultEditionId: idSchema,
  available: z.number().int().nonnegative(),
  favoritesCount: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
  createdAt: isoDateSchema,
})
export type NftSummary = z.infer<typeof nftSummarySchema>

/** Contagens para os filtros, considerando os demais filtros aplicados */
export const nftFacetsSchema = z.object({
  categories: z.record(nftCategorySchema, z.number().int().nonnegative()),
  networks: z.record(networkSchema, z.number().int().nonnegative()),
  /** Faixa de preço do catálogo inteiro, para os limites do controle de preço */
  priceRange: z.object({ min: ethAmountSchema, max: ethAmountSchema }),
})
export type NftFacets = z.infer<typeof nftFacetsSchema>

export const nftListSchema = paginatedSchema(nftSummarySchema).extend({
  facets: nftFacetsSchema,
})
export type NftList = z.infer<typeof nftListSchema>

export const nftSortSchema = z.enum(['recent', 'price_asc', 'price_desc', 'popular', 'name'])
export type NftSort = z.infer<typeof nftSortSchema>

export const nftAvailabilitySchema = z.enum(['all', 'available', 'sold_out'])
export type NftAvailability = z.infer<typeof nftAvailabilitySchema>

/** Abas do catálogo: todos, novos lançamentos (últimos 30 dias) e em alta (mais favoritados) */
export const nftFeedSchema = z.enum(['all', 'new', 'trending'])
export type NftFeed = z.infer<typeof nftFeedSchema>

/** Parâmetros de busca do catálogo, compartilhados entre URL, query e API */
export const nftListParamsSchema = z.object({
  q: z.string().trim().optional(),
  category: z.array(nftCategorySchema).optional(),
  network: z.array(networkSchema).optional(),
  minPrice: ethAmountSchema.optional(),
  maxPrice: ethAmountSchema.optional(),
  availability: nftAvailabilitySchema.optional(),
  feed: nftFeedSchema.optional(),
  /** Só NFTs em destaque (vitrine da tela inicial) */
  featured: z.boolean().optional(),
  sort: nftSortSchema.optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(48).optional(),
})
export type NftListParams = z.infer<typeof nftListParamsSchema>
