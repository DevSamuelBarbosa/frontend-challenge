import type { Network, NftCategory, NftFeed, NftSort } from '@/api/contracts'

/** Nomes exibidos das coleções, na ordem do filtro do design */
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
