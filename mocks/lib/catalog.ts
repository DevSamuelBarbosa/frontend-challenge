import type { Nft, NftEdition, NftSummary } from '@/api/contracts'
import { minEth } from '@/lib/eth'

/** Resumo do NFT para cards: menor preço entre as edições disponíveis */
export function toNftSummary(nft: Nft): NftSummary {
  const available = nft.editions.filter((e) => e.available > 0)
  const priced = available.length > 0 ? available : nft.editions
  return {
    id: nft.id,
    name: nft.name,
    category: nft.category,
    creator: nft.creator,
    image: nft.images[0],
    priceEth: minEth(priced.map((e) => e.priceEth)),
    available: nft.editions.reduce((total, e) => total + e.available, 0),
    favoritesCount: nft.favoritesCount,
    version: nft.version,
    createdAt: nft.createdAt,
  }
}

/** Busca sem diferenciar maiúsculas e acentos */
export function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function findEdition(nfts: Nft[], nftId: string, editionId: string) {
  const nft = nfts.find((n) => n.id === nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  return nft && edition ? { nft, edition } : null
}

/** Quantidade máxima que pode ir para o carrinho: estoque atual limitado por pedido */
export function maxQuantity(edition: NftEdition) {
  return Math.min(edition.available, edition.maxPerOrder)
}
