import type {
  EthAmount,
  Image,
  Network,
  Nft,
  NftCategory,
  NftEdition,
  NftReview,
} from '@/api/contracts'
import { eth, toEthAmount } from '@/lib/eth'
import { creators } from './creators'

/*
 * Catálogo determinístico com 36 NFTs (4 páginas de 9, como no Figma). Os 9
 * primeiros reproduzem nomes, preços e ordem da tela inicial do design.
 *
 * Casos especiais usados nos cenários e testes:
 *   nft-001  Emerald Ape #042, usado no cenário de alteração de preço
 *   nft-003  Neon Vessel #552: em oferta (preço anterior riscado) e raro
 *   nft-012  edição 1/1 esgotada, demais disponíveis
 *   nft-018  apenas 1 unidade disponível (esgota durante a compra)
 *   nft-021  limite de 2 unidades por pedido
 *   nft-025  todas as edições esgotadas
 *   nft-030  todas as edições esgotadas
 */

type Artwork = 'emerald-ape' | 'nomad-gorilla' | 'golden-ape' | 'ivory-ape'

const ARTWORK_ATTRIBUTES: Record<Artwork, string[]> = {
  'emerald-ape': ['Óculos', 'Esmeralda'],
  'nomad-gorilla': ['Chapéu', 'Moletom', 'Sereno'],
  'golden-ape': ['Fone', 'Dourado', 'Jaqueta'],
  'ivory-ape': ['Terno', 'Gola alta', 'Brinco'],
}

const ARTWORK_LABEL: Record<Artwork, string> = {
  'emerald-ape': 'macaco de óculos redondos e jaqueta verde',
  'nomad-gorilla': 'gorila de chapéu verde e moletom roxo',
  'golden-ape': 'macaco dourado com fone de ouvido',
  'ivory-ape': 'macaco de pelo escuro com terno claro',
}

// [nome, arte, coleção, rede, preço base (edição 1/50), índice do criador]
const ROWS: [string, Artwork, NftCategory, Network, EthAmount, number][] = [
  ['Emerald Ape #042', 'emerald-ape', 'digital_art', 'ethereum', '1.19', 0],
  ['Sage Nomad #009', 'nomad-gorilla', 'collectibles', 'polygon', '1.69', 1],
  ['Neon Vessel #552', 'ivory-ape', 'digital_art', 'ethereum', '1.99', 2],
  ['Cosmic Bloom #118', 'nomad-gorilla', 'generative', 'solana', '1.29', 3],
  ['Violet Nomad #314', 'nomad-gorilla', 'art_3d', 'ethereum', '1.39', 1],
  ['Ivory Baron #088', 'ivory-ape', 'photography', 'polygon', '1.79', 4],
  ['Golden Beat #207', 'golden-ape', 'music', 'ethereum', '0.99', 5],
  ['Golden Frequency #071', 'golden-ape', 'music', 'solana', '0.59', 5],
  ['Golden Signal #160', 'golden-ape', 'music', 'polygon', '0.39', 0],
  ['Jade Ape #017', 'emerald-ape', 'collectibles', 'ethereum', '2.45', 2],
  ['Moss Nomad #233', 'nomad-gorilla', 'games', 'solana', '0.42', 3],
  ['Onyx Duke #401', 'ivory-ape', 'digital_art', 'ethereum', '3.10', 4],
  ['Amber Echo #056', 'golden-ape', 'subscriptions', 'polygon', '0.18', 5],
  ['Velvet Ape #129', 'emerald-ape', 'art_3d', 'ethereum', '1.05', 0],
  ['Lilac Wanderer #077', 'nomad-gorilla', 'photography', 'polygon', '0.88', 1],
  ['Ivory Regent #310', 'ivory-ape', 'utility', 'ethereum', '4.80', 2],
  ['Golden Pulse #192', 'golden-ape', 'generative', 'solana', '0.27', 3],
  ['Emerald Crown #003', 'emerald-ape', 'digital_art', 'ethereum', '6.50', 4],
  ['Drift Nomad #456', 'nomad-gorilla', 'games', 'polygon', '0.33', 5],
  ['Ash Baron #219', 'ivory-ape', 'collectibles', 'solana', '1.49', 0],
  ['Golden Tempo #388', 'golden-ape', 'music', 'ethereum', '0.75', 1],
  ['Verdant Ape #264', 'emerald-ape', 'generative', 'polygon', '0.95', 2],
  ['Quiet Nomad #145', 'nomad-gorilla', 'subscriptions', 'ethereum', '0.12', 3],
  ['Pearl Envoy #507', 'ivory-ape', 'art_3d', 'solana', '2.25', 4],
  ['Golden Static #612', 'golden-ape', 'games', 'polygon', '0.55', 5],
  ['Forest Ape #089', 'emerald-ape', 'photography', 'ethereum', '1.35', 0],
  ['Bloom Nomad #321', 'nomad-gorilla', 'utility', 'solana', '0.65', 1],
  ['Slate Count #174', 'ivory-ape', 'digital_art', 'polygon', '2.90', 2],
  ['Golden Reverb #039', 'golden-ape', 'music', 'ethereum', '1.15', 3],
  ['Clover Ape #283', 'emerald-ape', 'collectibles', 'solana', '0.48', 4],
  ['Haze Nomad #198', 'nomad-gorilla', 'generative', 'ethereum', '0.79', 5],
  ['Marble Heir #066', 'ivory-ape', 'subscriptions', 'ethereum', '12.30', 0],
  ['Golden Chorus #521', 'golden-ape', 'art_3d', 'polygon', '0.69', 1],
  ['Mint Ape #340', 'emerald-ape', 'utility', 'ethereum', '0.02', 2],
  ['Dusk Nomad #412', 'nomad-gorilla', 'photography', 'solana', '1.89', 3],
  ['Cream Marquis #097', 'ivory-ape', 'games', 'polygon', '0.36', 4],
]

const IMAGE_WIDTHS = [240, 480, 960] as const
const BASE_DATE = Date.parse('2026-10-01T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

/** Imagem com as larguras geradas a partir do asset do Figma */
function artworkImage(artwork: Artwork, name: string, view: number): Image {
  return {
    url: `/images/nfts/${artwork}-480.webp`,
    alt:
      view === 0
        ? `${name}: ${ARTWORK_LABEL[artwork]}`
        : `${name}: ${ARTWORK_LABEL[artwork]}, visualização ${view + 1}`,
    width: 960,
    height: 960,
    variants: IMAGE_WIDTHS.map((width) => ({
      url: `/images/nfts/${artwork}-${width}.webp`,
      width,
    })),
  }
}

const times = (price: EthAmount, factor: string) => toEthAmount(eth(price).times(factor).round(2))

/** Edições 1/1, 1/10, 1/50 e aberta, com preço e estoque determinísticos */
function editions(id: string, n: number, basePrice: EthAmount): NftEdition[] {
  const tiers = [
    { suffix: 'ed1', name: '1/1', supply: 1, factor: '4', maxPerOrder: 1 },
    { suffix: 'ed10', name: '1/10', supply: 10, factor: '2', maxPerOrder: 3 },
    { suffix: 'ed50', name: '1/50', supply: 50, factor: '1', maxPerOrder: 10 },
    { suffix: 'open', name: 'ABERTA', supply: null, factor: '1.25', maxPerOrder: 20 },
  ]
  return tiers.map((tier, t) => ({
    id: `${id}-${tier.suffix}`,
    name: tier.name,
    priceEth: times(basePrice, tier.factor),
    compareAtPriceEth: null,
    supply: tier.supply,
    available: tier.supply === null ? 999 : 1 + ((n * 7 + t * 3) % tier.supply),
    maxPerOrder: tier.maxPerOrder,
  }))
}

const REVIEW_AUTHORS = ['Ana R.', 'Bruno C.', 'Lia M.', 'Theo S.', 'Iris K.', 'Rafa P.', 'June O.']
const REVIEW_COMMENTS = [
  'Arte impecável e procedência clara. Chegou na carteira em segundos.',
  'Os detalhes em alta resolução valem cada ETH.',
  'Coleção consistente, o criador entrega o que promete.',
  'Gostei dos benefícios para colecionadores, comunidade muito ativa.',
  'Bom preço para a edição, transação simples.',
  'Peça favorita da minha coleção até agora.',
]

/** Avaliações determinísticas (Emerald Ape #042 tem 19, como no design) */
function reviews(id: string, n: number): NftReview[] {
  const count = n === 1 ? 19 : 3 + ((n * 7) % 14)
  return Array.from({ length: count }, (_, i) => ({
    id: `${id}-review-${i + 1}`,
    author: REVIEW_AUTHORS[(n + i) % REVIEW_AUTHORS.length],
    rating: 5 - ((n + i * 3) % 7 === 0 ? 1 : 0) - ((n * i) % 11 === 0 && i > 0 ? 1 : 0),
    comment: REVIEW_COMMENTS[(n * 3 + i) % REVIEW_COMMENTS.length],
    createdAt: new Date(BASE_DATE - (n + i * 2) * DAY).toISOString(),
  }))
}

const NETWORK_LABEL: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

/** Endereço de contrato determinístico, no formato da rede */
function contractAddress(n: number, network: Network) {
  // O primeiro NFT usa o endereço do design (0x7A42...19E8)
  if (n === 1) return `0x7A42${'c0ffee'.repeat(5)}ab${'19E8'}`
  const hex = Array.from({ length: 40 }, (_, i) => ((n * 31 + i * 17) % 16).toString(16)).join('')
  if (network !== 'solana') return `0x${hex.toUpperCase()}`
  const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  return Array.from({ length: 44 }, (_, i) => base58[(n * 13 + i * 7) % base58.length]).join('')
}

function applySpecialCases(nft: Nft): Nft {
  switch (nft.id) {
    case 'nft-003':
      nft.editions = nft.editions.map((e) => ({
        ...e,
        compareAtPriceEth: e.name === '1/50' ? '2.29' : e.compareAtPriceEth,
      }))
      break
    case 'nft-025':
    case 'nft-030':
      nft.editions = nft.editions.map((e) => ({ ...e, available: 0 }))
      break
    case 'nft-012':
      nft.editions = nft.editions.map((e) => (e.name === '1/1' ? { ...e, available: 0 } : e))
      break
    case 'nft-018':
      nft.editions = nft.editions.map((e) => ({ ...e, available: 1 }))
      break
    case 'nft-021':
      nft.editions = nft.editions.map((e) => ({ ...e, maxPerOrder: Math.min(2, e.maxPerOrder) }))
      break
  }
  return nft
}

export const nfts: Nft[] = ROWS.map(
  ([name, artwork, category, network, price, creatorIndex], i) => {
    const n = i + 1
    const id = `nft-${String(n).padStart(3, '0')}`
    const token = name.split('#')[1] ?? String(n)
    const reviewList = reviews(id, n)
    const average = reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewList.length
    const creator = creators[creatorIndex]
    const networkName = NETWORK_LABEL[network]

    return applySpecialCases({
      id,
      name,
      tokenId: `#${token.padStart(4, '0')}`,
      description: `Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na ${networkName}, com arte desbloqueável e acesso para colecionadores.`,
      details: [
        `${name} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na ${networkName}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
        `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${creator.name} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
      ],
      category,
      collectionName: 'Kurio Apes',
      network,
      contract: {
        address: contractAddress(n, network),
        standard: network === 'solana' ? 'Metaplex' : 'ERC-721',
        royaltyPercent: 5,
      },
      attributes: [...ARTWORK_ATTRIBUTES[artwork], ...(n % 7 === 3 || n === 1 ? ['Raro'] : [])],
      rarity: n % 7 === 3 ? 'rare' : 'common',
      featured: ['nft-001', 'nft-002', 'nft-006'].includes(id),
      creator,
      // A galeria do design mostra quatro visualizações da mesma arte
      images: [0, 1, 2, 3].map((view) => artworkImage(artwork, name, view)),
      editions: editions(id, n, price),
      tags: [...ARTWORK_ATTRIBUTES[artwork].map((a) => a.toLowerCase()), networkName.toLowerCase()],
      rating: { average: Math.round(average * 10) / 10, count: reviewList.length },
      reviews: reviewList,
      favoritesCount: (n * 37) % 500,
      version: 1,
      // Ordem de "listados recentemente" igual à grade do design
      createdAt: new Date(BASE_DATE - n * DAY).toISOString(),
    })
  },
)
