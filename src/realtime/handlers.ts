import type { QueryClient } from '@tanstack/react-query'
import type {
  Cart,
  FavoriteList,
  Nft,
  NftList,
  NftSummary,
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
} from '@/api/contracts'
import { compareEth } from '@/lib/eth'
import { queryKeys } from '@/queries/keys'
import { realtimeNotices } from './store'

type EditionUpdate = NftUpdatedEvent['data']['editions'][number]

/**
 * Regra central: um evento só é aplicado se for mais novo que o dado em cache.
 * Duplicatas e eventos antigos são descartados sem efeito, e um dado mais recente
 * vindo do REST nunca é sobrescrito por um evento atrasado.
 */
const isNewer = (cachedVersion: number | undefined, eventVersion: number) =>
  cachedVersion === undefined || eventVersion > cachedVersion

function patchSummary(item: NftSummary, event: NftUpdatedEvent): NftSummary {
  if (item.id !== event.resource.id || !isNewer(item.version, event.version)) return item
  return {
    ...item,
    priceEth: event.data.priceEth,
    available: event.data.available,
    version: event.version,
  }
}

/** Atualiza preço e disponibilidade no detalhe, catálogo, favoritos e carrinhos */
export function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent) {
  const nftId = event.resource.id
  const editions = new Map(event.data.editions.map((e) => [e.id, e]))

  queryClient.setQueryData<Nft>(queryKeys.nfts.detail(nftId), (nft) => {
    if (!nft || !isNewer(nft.version, event.version)) return nft
    return {
      ...nft,
      version: event.version,
      editions: nft.editions.map((e) => ({ ...e, ...pickEdition(editions.get(e.id)) })),
    }
  })

  queryClient.setQueriesData<NftList>(
    { queryKey: [...queryKeys.nfts.all, 'list'] },
    (list) => list && { ...list, items: list.items.map((item) => patchSummary(item, event)) },
  )
  // Filtros e ordenação podem ter mudado com o novo preço: listas são revalidadas
  // quando voltarem a ser exibidas, sem refazer agora as que estão fora da tela
  void queryClient.invalidateQueries({
    queryKey: [...queryKeys.nfts.all, 'list'],
    refetchType: 'none',
  })

  queryClient.setQueriesData<FavoriteList>(
    { predicate: (q) => q.queryKey[0] === 'user' && q.queryKey[2] === 'favorites' },
    (list) => list && { ...list, items: list.items.map((item) => patchSummary(item, event)) },
  )

  let anyCartChanged = false
  queryClient.setQueriesData<Cart>({ predicate: isCartQuery }, (cart) => {
    if (!cart) return cart
    let changed = false
    const items = cart.items.map((item) => {
      const update = editions.get(item.editionId)
      if (item.nftId !== nftId || !update || !isNewer(item.nftVersion, event.version)) return item
      notifyCartChange(event, item, update)
      changed = true
      return {
        ...item,
        unitPriceEth: update.priceEth,
        available: update.available,
        maxPerOrder: update.maxPerOrder,
        nftVersion: event.version,
      }
    })
    anyCartChanged ||= changed
    return changed ? { ...cart, items } : cart
  })

  // O resumo de valores vem da cotação: com o carrinho alterado, ela é refeita
  if (anyCartChanged) {
    void queryClient.invalidateQueries({
      predicate: (q) => q.queryKey[0] === 'user' && q.queryKey[2] === 'quote',
    })
  }
}

function pickEdition(update: EditionUpdate | undefined) {
  if (!update) return {}
  const { priceEth, available, maxPerOrder } = update
  return { priceEth, available, maxPerOrder }
}

function isCartQuery(query: { queryKey: readonly unknown[] }) {
  const [scope, , resource] = query.queryKey
  return scope === 'guest-cart' || (scope === 'user' && resource === 'cart')
}

function notifyCartChange(
  event: NftUpdatedEvent,
  item: Cart['items'][number],
  update: EditionUpdate,
) {
  const base = {
    nftId: item.nftId,
    editionId: item.editionId,
    name: item.name,
    editionName: item.editionName,
    at: event.occurredAt,
  }
  if (compareEth(item.unitPriceEth, update.priceEth) !== 0) {
    realtimeNotices.push({
      ...base,
      id: `${event.id}:${item.editionId}:price`,
      kind: 'price_changed',
      previous: item.unitPriceEth,
      current: update.priceEth,
    })
  }
  if (item.available !== update.available) {
    realtimeNotices.push({
      ...base,
      id: `${event.id}:${item.editionId}:availability`,
      kind: 'availability_changed',
      previous: String(item.available),
      current: String(update.available),
    })
  }
}

const TERMINAL_STATUSES: Order['status'][] = ['confirmed', 'rejected']

/** Atualiza o pedido do usuário. Pedidos confirmados ou recusados não mudam mais. */
export function applyOrderUpdated(
  queryClient: QueryClient,
  userId: string,
  event: OrderUpdatedEvent,
) {
  const order = event.data
  queryClient.setQueryData<Order>(queryKeys.user.order(userId, order.id), (cached) => {
    if (cached && !isNewer(cached.version, event.version)) return cached
    if (cached && TERMINAL_STATUSES.includes(cached.status)) return cached
    return order
  })
  void queryClient.invalidateQueries({ queryKey: queryKeys.user.orders(userId), exact: true })

  // Pedido confirmado remove itens do carrinho: busca o carrinho atualizado
  if (order.status === 'confirmed') {
    void queryClient.invalidateQueries({ queryKey: queryKeys.user.cart(userId) })
  }
}

/**
 * Depois de uma reconexão, eventos podem ter sido perdidos: os recursos em uso
 * são buscados de novo na API REST, que é a fonte da verdade.
 */
export function reconcileAfterReconnect(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] === 'nfts' ||
      queryKey[0] === 'guest-cart' ||
      (queryKey[0] === 'user' &&
        ['cart', 'quote', 'orders', 'favorites'].includes(String(queryKey[2]))),
    refetchType: 'active',
  })
}
