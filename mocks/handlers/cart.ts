import { HttpResponse } from 'msw'
import {
  addCartItemRequestSchema,
  mergeCartRequestSchema,
  type NftEdition,
  updateCartItemRequestSchema,
} from '@/api/contracts'
import { db } from '../db'
import { findCartItemByEdition, guestCartKey, toCart, upsertCartItem } from '../lib/cart'
import { findEdition, maxQuantity } from '../lib/catalog'
import { api } from '../lib/http'
import { errorResponse, parseBody } from '../lib/responses'
import { requireCartOwner, requireSession } from '../lib/session'

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
  api.get('/cart', ({ request }) => {
    const owner = requireCartOwner(request)
    return HttpResponse.json(toCart(owner))
  }),

  api.post('/cart/items', async ({ request }) => {
    const owner = requireCartOwner(request)
    const body = await parseBody(request, addCartItemRequestSchema)
    const found = findEdition(db.state.nfts, body.nftId, body.editionId)
    if (!found) return errorResponse('not_found', 'NFT ou edição não encontrados')

    // Adicionar a mesma edição soma com a quantidade já existente
    const existing = findCartItemByEdition(owner, body.editionId)
    const quantity = (existing?.quantity ?? 0) + body.quantity
    if (quantity > maxQuantity(found.edition)) return availabilityConflict(found.edition)

    upsertCartItem(owner, { nftId: body.nftId, editionId: body.editionId, quantity })
    return HttpResponse.json(toCart(owner), { status: existing ? 200 : 201 })
  }),

  api.patch('/cart/items/:itemId', async ({ request, params }) => {
    const owner = requireCartOwner(request)
    const { quantity } = await parseBody(request, updateCartItemRequestSchema)
    const item = db.state.carts[owner]?.find((i) => i.id === params.itemId)
    if (!item) return errorResponse('not_found', 'Item não encontrado no carrinho')

    const found = findEdition(db.state.nfts, item.nftId, item.editionId)
    if (!found) return errorResponse('not_found', 'NFT ou edição não encontrados')
    if (quantity > maxQuantity(found.edition)) return availabilityConflict(found.edition)

    db.update((draft) => {
      const target = draft.carts[owner].find((i) => i.id === params.itemId)!
      target.quantity = quantity
      target.addedAt = new Date().toISOString()
    })
    return HttpResponse.json(toCart(owner))
  }),

  api.delete('/cart/items/:itemId', ({ request, params }) => {
    const owner = requireCartOwner(request)
    if (!db.state.carts[owner]?.some((i) => i.id === params.itemId)) {
      return errorResponse('not_found', 'Item não encontrado no carrinho')
    }
    db.update((draft) => {
      draft.carts[owner] = draft.carts[owner].filter((i) => i.id !== params.itemId)
    })
    return HttpResponse.json(toCart(owner))
  }),

  /**
   * Junta o carrinho do visitante ao da conta e descarta o do visitante. Itens
   * inexistentes ou esgotados são ignorados e as quantidades são limitadas à
   * disponibilidade, sem gerar erro: o login nunca falha por causa do carrinho.
   */
  api.post('/cart/merge', async ({ request }) => {
    const { user } = requireSession(request)
    const { guestCartId } = await parseBody(request, mergeCartRequestSchema)
    const guestKey = guestCartKey(guestCartId)

    for (const incoming of db.state.carts[guestKey] ?? []) {
      const found = findEdition(db.state.nfts, incoming.nftId, incoming.editionId)
      if (!found) continue
      const max = maxQuantity(found.edition)
      const existing = findCartItemByEdition(user.id, incoming.editionId)
      const quantity = Math.min((existing?.quantity ?? 0) + incoming.quantity, max)
      if (quantity <= 0) continue
      upsertCartItem(user.id, { nftId: incoming.nftId, editionId: incoming.editionId, quantity })
    }
    db.update((draft) => {
      delete draft.carts[guestKey]
    })
    return HttpResponse.json(toCart(user.id))
  }),
]
