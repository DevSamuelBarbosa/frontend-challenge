import { HttpResponse } from 'msw'
import {
  nftListParamsSchema,
  type NftList,
  type NftListParams,
  type NftSummary,
} from '@/api/contracts'
import { compareEth } from '@/lib/eth'
import { db } from '../db'
import { normalizeText, toNftSummary } from '../lib/catalog'
import { api } from '../lib/http'
import { errorResponse } from '../lib/responses'

const DEFAULT_PAGE_SIZE = 12

/** Lê os parâmetros da URL. Aceita `category=a&category=b`, `category[]=a` e `category=a,b`. */
function readParams(url: URL) {
  const get = (key: string) => url.searchParams.get(key) ?? undefined
  const categories = [
    ...url.searchParams.getAll('category'),
    ...url.searchParams.getAll('category[]'),
  ]
    .flatMap((value) => value.split(','))
    .filter(Boolean)
  const toInt = (value?: string) => (value === undefined ? undefined : Number(value))

  return nftListParamsSchema.safeParse({
    q: get('q'),
    category: categories.length > 0 ? categories : undefined,
    minPrice: get('minPrice'),
    maxPrice: get('maxPrice'),
    availability: get('availability'),
    sort: get('sort'),
    page: toInt(get('page')),
    pageSize: toInt(get('pageSize')),
  })
}

function matches(item: NftSummary, tags: string[], params: NftListParams) {
  if (params.q) {
    const q = normalizeText(params.q)
    const haystack = [item.name, item.creator.name, ...tags].map(normalizeText)
    if (!haystack.some((text) => text.includes(q))) return false
  }
  if (params.category && !params.category.includes(item.category)) return false
  if (params.minPrice && compareEth(item.priceEth, params.minPrice) < 0) return false
  if (params.maxPrice && compareEth(item.priceEth, params.maxPrice) > 0) return false
  if (params.availability === 'available' && item.available === 0) return false
  if (params.availability === 'sold_out' && item.available > 0) return false
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

    const filtered = db.state.nfts
      .filter((nft) => matches(toNftSummary(nft), nft.tags, params))
      .map(toNftSummary)
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
    }
    return HttpResponse.json(body)
  }),

  api.get('/nfts/:nftId', ({ params }) => {
    const nft = db.state.nfts.find((n) => n.id === params.nftId)
    if (!nft) return errorResponse('not_found', 'NFT não encontrado')
    return HttpResponse.json(nft)
  }),
]
