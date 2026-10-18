import type { Network, NftCategory, NftFeed, NftSort } from '@/api/contracts'
import { nftCategorySchema } from '@/api/contracts'

/** Nomes exibidos das coleções */
export const CATEGORY_LABELS: Record<NftCategory, string> = {
  digital_art: 'Arte digital',
  photography: 'Fotografia',
  music: 'Música',
  art_3d: 'Arte 3D',
  collectibles: 'Colecionáveis',
  generative: 'Generativa',
  games: 'Jogos',
  subscriptions: 'Assinaturas',
  utility: 'Utilidade',
}

/** Coleções em ordem alfabética (pt-BR), para as listas de filtro e de links */
export const CATEGORIES_ALPHABETICAL = [...nftCategorySchema.options].sort((a, b) =>
  CATEGORY_LABELS[a].localeCompare(CATEGORY_LABELS[b], 'pt-BR'),
)

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const FEED_LABELS: Record<NftFeed, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

export const SORT_LABELS: Record<NftSort, string> = {
  recent: 'Listados recentemente',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  popular: 'Mais favoritados',
  name: 'Nome (A-Z)',
}
