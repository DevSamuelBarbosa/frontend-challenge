import { HttpResponse } from 'msw'
import {
  type NftCategory,
  nftCategorySchema,
  type NftFacets,
  nftListParamsSchema,
  type NftList,
  type NftListParams,
  type NftSummary,
  type Network,
  networkSchema,
} from '@/api/contracts'
import { compareEth } from '@/lib/eth'
import { db } from '../db'
import { normalizeText, toNftSummary } from '../lib/catalog'
import { api } from '../lib/http'
import { errorResponse } from '../lib/responses'

const DEFAULT_PAGE_SIZE = 9
const NEW_RELEASE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
const TRENDING_MIN_FAVORITES = 200

/** Aceita `key=a&key=b`, `key[]=a` e `key=a,b` */
function readList(url: URL, key: string) {
  const values = [...url.searchParams.getAll(key), ...url.searchParams.getAll(`${key}[]`)]
    .flatMap((value) => value.split(','))
    .filter(Boolean)
  return values.length > 0 ? values : undefined
}

function readParams(url: URL) {
  const get = (key: string) => url.searchParams.get(key) ?? undefined
  const toInt = (value?: string) => (value === undefined ? undefined : Number(value))

  return nftListParamsSchema.safeParse({
    q: get('q'),
    category: readList(url, 'category'),
    network: readList(url, 'network'),
    minPrice: get('minPrice'),
    maxPrice: get('maxPrice'),
    availability: get('availability'),
    feed: get('feed'),
    sort: get('sort'),
    page: toInt(get('page')),
    pageSize: toInt(get('pageSize')),
  })
}

interface Entry {
  summary: NftSummary
  tags: string[]
}

/** Filtros, com a opção de ignorar um deles (para contar as opções desse filtro) */
function matches(
  { summary: item, tags }: Entry,
  params: NftListParams,
  newestDate: number,
  ignore?: 'category' | 'network',
) {
  if (params.q) {
    const q = normalizeText(params.q)
    const haystack = [item.name, item.creator.name, ...tags].map(normalizeText)
    if (!haystack.some((text) => text.includes(q))) return false
  }
  if (ignore !== 'category' && params.category && !params.category.includes(item.category)) {
    return false
  }
  if (ignore !== 'network' && params.network && !params.network.includes(item.network)) {
    return false
  }
  if (params.minPrice && compareEth(item.priceEth, params.minPrice) < 0) return false
  if (params.maxPrice && compareEth(item.priceEth, params.maxPrice) > 0) return false
  if (params.availability === 'available' && item.available === 0) return false
  if (params.availability === 'sold_out' && item.available > 0) return false
  if (params.feed === 'new' && newestDate - Date.parse(item.createdAt) > NEW_RELEASE_WINDOW_MS) {
    return false
  }
  if (params.feed === 'trending' && item.favoritesCount < TRENDING_MIN_FAVORITES) return false
  return true
}

const sorters: Record<
  NonNullable<NftListParams['sort']>,
  (a: NftSummary, b: NftSummary) => number
> = {
  recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  price_asc: (a, b) => compareEth(a.priceEth, b.priceEth),
  price_desc: (a, b) => compareEth(b.priceEth, a.priceEth),
  popular: (a, b) => b.favoritesCount - a.favoritesCount,
  name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
}

function countBy<K extends string>(keys: readonly K[], values: K[]) {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>
  for (const value of values) counts[value] += 1
  return counts
}

/**
 * Contagens dos filtros. Cada filtro é contado considerando os demais: ao marcar
 * "Música", as contagens de rede refletem só NFTs de música, mas as de coleção
 * continuam mostrando quantos há em cada coleção.
 */
function facets(entries: Entry[], params: NftListParams, newestDate: number): NftFacets {
  const prices = entries.map((e) => e.summary.priceEth)
  const sortedPrices = [...prices].sort(compareEth)
  return {
    categories: countBy<NftCategory>(
      nftCategorySchema.options,
      entries
        .filter((e) => matches(e, params, newestDate, 'category'))
        .map((e) => e.summary.category),
    ),
    networks: countBy<Network>(
      networkSchema.options,
      entries
        .filter((e) => matches(e, params, newestDate, 'network'))
        .map((e) => e.summary.network),
    ),
    priceRange: {
      min: sortedPrices[0] ?? '0',
      max: sortedPrices.at(-1) ?? '0',
    },
  }
}

export const nftHandlers = [
  api.get('/nfts', ({ request }) => {
    const parsed = readParams(new URL(request.url))
    if (!parsed.success) {
      return errorResponse('validation_error', 'Parâmetros de busca inválidos', {
        fields: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])),
      })
    }
    const params = parsed.data
    const sort = sorters[params.sort ?? 'recent']

    const entries: Entry[] = db.state.nfts.map((nft) => ({
      summary: toNftSummary(nft),
      tags: nft.tags,
    }))
    const newestDate = Math.max(...entries.map((e) => Date.parse(e.summary.createdAt)), 0)

    const filtered = entries
      .filter((entry) => matches(entry, params, newestDate))
      .map((entry) => entry.summary)
      // Desempate pelo id para a ordem ser sempre a mesma
      .sort((a, b) => sort(a, b) || a.id.localeCompare(b.id))

    const page = params.page ?? 1
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE
    const body: NftList = {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / pageSize),
      facets: facets(entries, params, newestDate),
    }
    return HttpResponse.json(body)
  }),

  api.get('/nfts/:nftId', ({ params }) => {
    const nft = db.state.nfts.find((n) => n.id === params.nftId)
    if (!nft) return errorResponse('not_found', 'NFT não encontrado')
    return HttpResponse.json(nft)
  }),
]
