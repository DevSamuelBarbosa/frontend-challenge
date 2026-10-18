import { http, HttpResponse } from 'msw'
import {
  addCartItemRequestSchema,
  mergeCartRequestSchema,
  type NftEdition,
  updateCartItemRequestSchema,
} from '@/api/contracts'
import { db } from '../db'
import { findCartItemByEdition, toCart, upsertCartItem } from '../lib/cart'
import { findEdition, maxQuantity } from '../lib/catalog'
import { errorResponse, parseBody } from '../lib/responses'
import { requireSession } from '../lib/session'
import { apiUrl } from '../utils'

/** Conflito de disponibilidade, com os limites para a interface ajustar a quantidade */
function availabilityConflict(edition: NftEdition) {
  const max = maxQuantity(edition)
  return errorResponse(
    'conflict',
    max === 0
      ? 'Esta edição está esgotada'
      : `Quantidade indisponível. Você pode adicionar até ${max} unidade(s).`,
    {
      details: {
        reason: max === 0 ? 'sold_out' : 'quantity_exceeded',
        editionId: edition.id,
        available: edition.available,
        maxPerOrder: edition.maxPerOrder,
        max,
      },
    },
  )
}

export const cartHandlers = [
  http.get(apiUrl('/cart'), ({ request }) => {
    const { user } = requireSession(request)
    return HttpResponse.json(toCart(user.id))
  }),

  http.post(apiUrl('/cart/items'), async ({ request }) => {
    const { user } = requireSession(request)
    const body = await parseBody(request, addCartItemRequestSchema)
    const found = findEdition(db.state.nfts, body.nftId, body.editionId)
    if (!found) return errorResponse('not_found', 'NFT ou edição não encontrados')

    // Adicionar a mesma edição soma com a quantidade já existente
    const existing = findCartItemByEdition(user.id, body.editionId)
    const quantity = (existing?.quantity ?? 0) + body.quantity
    if (quantity > maxQuantity(found.edition)) return availabilityConflict(found.edition)

    upsertCartItem(user.id, { nftId: body.nftId, editionId: body.editionId, quantity })
    return HttpResponse.json(toCart(user.id), { status: existing ? 200 : 201 })
  }),

  http.patch(apiUrl('/cart/items/:itemId'), async ({ request, params }) => {
    const { user } = requireSession(request)
    const { quantity } = await parseBody(request, updateCartItemRequestSchema)
    const item = db.state.carts[user.id]?.find((i) => i.id === params.itemId)
    if (!item) return errorResponse('not_found', 'Item não encontrado no carrinho')

    const found = findEdition(db.state.nfts, item.nftId, item.editionId)
    if (!found) return errorResponse('not_found', 'NFT ou edição não encontrados')
    if (quantity > maxQuantity(found.edition)) return availabilityConflict(found.edition)

    db.update((draft) => {
      const target = draft.carts[user.id].find((i) => i.id === params.itemId)!
      target.quantity = quantity
      target.addedAt = new Date().toISOString()
    })
    return HttpResponse.json(toCart(user.id))
  }),

  http.delete(apiUrl('/cart/items/:itemId'), ({ request, params }) => {
    const { user } = requireSession(request)
    if (!db.state.carts[user.id]?.some((i) => i.id === params.itemId)) {
      return errorResponse('not_found', 'Item não encontrado no carrinho')
    }
    db.update((draft) => {
      draft.carts[user.id] = draft.carts[user.id].filter((i) => i.id !== params.itemId)
    })
    return HttpResponse.json(toCart(user.id))
  }),

  /**
   * Junta o carrinho do visitante ao da conta. Itens inexistentes ou esgotados são
   * ignorados e as quantidades são limitadas à disponibilidade, sem gerar erro.
   */
  http.post(apiUrl('/cart/merge'), async ({ request }) => {
    const { user } = requireSession(request)
    const { items } = await parseBody(request, mergeCartRequestSchema)

    for (const incoming of items) {
      const found = findEdition(db.state.nfts, incoming.nftId, incoming.editionId)
      if (!found) continue
      const max = maxQuantity(found.edition)
      const existing = findCartItemByEdition(user.id, incoming.editionId)
      const quantity = Math.min((existing?.quantity ?? 0) + incoming.quantity, max)
      if (quantity <= 0) continue

      upsertCartItem(user.id, { ...incoming, quantity })
    }
    return HttpResponse.json(toCart(user.id))
  }),
]
