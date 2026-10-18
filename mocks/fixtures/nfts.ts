import type { Image, Nft, NftCategory, NftEdition } from '@/api/contracts'
import { creators } from './creators'

/*
 * Catálogo determinístico com 40 NFTs. Casos especiais usados nos cenários e testes:
 *   nft-001  edição única, usada no cenário de alteração de preço
 *   nft-003  limite de 2 unidades por pedido
 *   nft-007  todas as edições esgotadas
 *   nft-012  edição "Rara" esgotada, demais disponíveis
 *   nft-018  apenas 1 unidade disponível (esgota durante a compra)
 *   nft-025  todas as edições esgotadas
 */

/** Preços em ordem crescente: as edições usam degraus desta lista */
const PRICES = [
  '0.015',
  '0.025',
  '0.033',
  '0.05',
  '0.08',
  '0.12',
  '0.18',
  '0.25',
  '0.3',
  '0.45',
  '0.5',
  '0.75',
  '0.95',
  '1.2',
  '1.5',
  '2.25',
  '3.1',
  '4.8',
  '6.5',
  '9.75',
]

const EDITION_TIERS = [
  { suffix: 'standard', name: 'Edição Padrão', supply: 50, priceStep: 0 },
  { suffix: 'limited', name: 'Edição Limitada', supply: 10, priceStep: 2 },
  { suffix: 'rare', name: 'Edição Rara', supply: 3, priceStep: 4 },
] as const

const DESCRIPTIONS: Record<NftCategory, string> = {
  art: 'Obra digital criada a partir de camadas de cor e forma, explorando ritmo e contraste.',
  collectibles: 'Item colecionável de uma série numerada, com arte exclusiva para cada edição.',
  music: 'Capa visual de um lançamento musical, com acesso ao áudio original para os detentores.',
  photography: 'Fotografia digital tratada como peça única, com tiragem limitada por edição.',
  video: 'Loop visual de curta duração pensado para telas e exposições digitais.',
  utility: 'Passe digital que libera benefícios exclusivos na comunidade do criador.',
  sport: 'Momento esportivo registrado em arte digital, numerado por edição.',
  virtual_worlds: 'Ativo para mundos virtuais, com arte e metadados do terreno ou objeto.',
}

// [nome, categoria, índice do criador, índice do preço base, quantidade de edições, tags]
const ROWS: [string, NftCategory, number, number, 1 | 2 | 3, string[]][] = [
  ['Distant Galaxy', 'art', 0, 8, 1, ['espaço', 'abstrato']],
  ['Life On Edena', 'art', 0, 10, 3, ['espaço', 'paisagem']],
  ['AstroFiction', 'collectibles', 1, 6, 2, ['espaço', 'retrô']],
  ['CryptoCity', 'virtual_worlds', 5, 12, 2, ['cidade', 'pixel']],
  ['Colorful Dog 0356', 'collectibles', 3, 3, 3, ['animais', 'cores']],
  ['Shroomie Forest', 'art', 3, 5, 2, ['natureza', 'fantasia']],
  ['Golden Hour Lisbon', 'photography', 4, 9, 2, ['cidade', 'viagem']],
  ['Neon Tide', 'video', 1, 11, 1, ['mar', 'neon']],
  ['Bass Cathedral', 'music', 2, 7, 3, ['eletrônica', 'capa']],
  ['Pixel Harbor #12', 'virtual_worlds', 5, 4, 2, ['pixel', 'mar']],
  ['Midnight Fox', 'art', 3, 2, 3, ['animais', 'noite']],
  ['Chromatic Wave', 'art', 1, 13, 3, ['abstrato', 'cores']],
  ['Saudade FM', 'music', 2, 1, 1, ['brasil', 'capa']],
  ['Last Penalty', 'sport', 2, 6, 2, ['futebol', 'momento']],
  ['Founders Pass', 'utility', 0, 15, 1, ['acesso', 'comunidade']],
  ['Lagoon Dreams', 'photography', 4, 5, 2, ['natureza', 'mar']],
  ['Orbit Station', 'virtual_worlds', 0, 14, 2, ['espaço', 'terreno']],
  ['Glass Garden', 'art', 4, 16, 1, ['natureza', 'abstrato']],
  ['Robo Samba', 'music', 2, 3, 2, ['brasil', 'robôs']],
  ['Dunk Replay', 'sport', 5, 2, 3, ['basquete', 'momento']],
  ['Velvet Static', 'video', 1, 8, 2, ['ruído', 'loop']],
  ['Moonlit Koi', 'art', 3, 9, 3, ['animais', 'noite']],
  ['Studio Pass 2026', 'utility', 1, 11, 1, ['acesso', 'eventos']],
  ['Copacabana 6AM', 'photography', 4, 4, 2, ['brasil', 'praia']],
  ['Quantum Bloom', 'art', 0, 17, 1, ['abstrato', 'ciência']],
  ['Paper Planets', 'collectibles', 5, 0, 3, ['espaço', 'papel']],
  ['Hyperloop Ticket', 'utility', 5, 7, 2, ['acesso', 'futuro']],
  ['Desert Signal', 'video', 1, 12, 2, ['deserto', 'loop']],
  ['Coral Code', 'art', 3, 6, 3, ['mar', 'generativo']],
  ['Final Lap', 'sport', 2, 10, 2, ['corrida', 'momento']],
  ['Aurora Index', 'photography', 4, 13, 1, ['natureza', 'noite']],
  ['Cyber Botanica', 'collectibles', 3, 5, 3, ['natureza', 'cyberpunk']],
  ['Lo-fi Rooftop', 'music', 2, 2, 2, ['lo-fi', 'cidade']],
  ['Isle of Blocks', 'virtual_worlds', 5, 9, 3, ['pixel', 'ilha']],
  ['Prism Walker', 'art', 1, 18, 1, ['abstrato', 'luz']],
  ['Rainforest Echo', 'photography', 4, 7, 2, ['brasil', 'natureza']],
  ['Arcade Spirits', 'collectibles', 5, 1, 3, ['jogos', 'retrô']],
  ['Solar Sail', 'video', 0, 15, 1, ['espaço', 'loop']],
  ['Tidal Chorus', 'music', 2, 8, 2, ['mar', 'ambiente']],
  ['Genesis Key', 'utility', 0, 19, 1, ['acesso', 'gênesis']],
]

const ART_COUNT = 16
const BASE_DATE = Date.parse('2026-06-01T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

function image(index: number, name: string, view: number): Image {
  const file = String((index % ART_COUNT) + 1).padStart(2, '0')
  return {
    url: `/images/nfts/art-${file}.svg`,
    alt: view === 0 ? `Arte do NFT ${name}` : `Arte do NFT ${name}, visualização ${view + 1}`,
    width: 800,
    height: 800,
  }
}

function editions(id: string, n: number, priceIndex: number, count: number): NftEdition[] {
  return EDITION_TIERS.slice(0, count).map((tier, t) => ({
    id: `${id}-${tier.suffix}`,
    name: tier.name,
    priceEth: PRICES[Math.min(priceIndex + tier.priceStep, PRICES.length - 1)],
    supply: tier.supply,
    // Disponibilidade determinística entre 1 e o supply
    available: 1 + ((n * 7 + t * 3) % tier.supply),
    maxPerOrder: Math.min(5, tier.supply),
  }))
}

function applySpecialCases(nft: Nft): Nft {
  switch (nft.id) {
    case 'nft-003':
      nft.editions = nft.editions.map((e) => ({
        ...e,
        maxPerOrder: 2,
        available: Math.max(3, e.available),
      }))
      break
    case 'nft-007':
    case 'nft-025':
      nft.editions = nft.editions.map((e) => ({ ...e, available: 0 }))
      break
    case 'nft-012':
      nft.editions = nft.editions.map((e) => (e.id.endsWith('-rare') ? { ...e, available: 0 } : e))
      break
    case 'nft-018':
      nft.editions = nft.editions.map((e) => ({ ...e, available: 1 }))
      break
  }
  return nft
}

export const nfts: Nft[] = ROWS.map(
  ([name, category, creatorIndex, priceIndex, count, tags], i) => {
    const n = i + 1
    const id = `nft-${String(n).padStart(3, '0')}`
    return applySpecialCases({
      id,
      name,
      description: DESCRIPTIONS[category],
      category,
      creator: creators[creatorIndex],
      images: [image(i, name, 0), image(i + 5, name, 1), image(i + 11, name, 2)].slice(
        0,
        1 + (n % 3),
      ),
      editions: editions(id, n, priceIndex, count),
      tags,
      favoritesCount: (n * 37) % 500,
      version: 1,
      createdAt: new Date(BASE_DATE - n * DAY).toISOString(),
    })
  },
)
