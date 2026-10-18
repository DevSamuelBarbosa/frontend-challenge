import type { Cart, CartItem } from '@/api/contracts'
import { db } from '../db'
import { findEdition } from './catalog'

/** Monta o carrinho com os dados atuais do catálogo */
export function toCart(userId: string): Cart {
  const items = db.state.carts[userId] ?? []
  const lines: CartItem[] = []
  for (const item of items) {
    const found = findEdition(db.state.nfts, item.nftId, item.editionId)
    if (!found) continue
    const { nft, edition } = found
    lines.push({
      id: item.id,
      nftId: nft.id,
      editionId: edition.id,
      quantity: item.quantity,
      name: nft.name,
      editionName: edition.name,
      image: nft.images[0],
      unitPriceEth: edition.priceEth,
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
      nftVersion: nft.version,
    })
  }
  const updatedAt = items.reduce(
    (latest, item) => (item.addedAt > latest ? item.addedAt : latest),
    new Date(0).toISOString(),
  )
  return { items: lines, updatedAt }
}

export function findCartItemByEdition(userId: string, editionId: string) {
  return db.state.carts[userId]?.find((i) => i.editionId === editionId)
}

/** Cria o item ou atualiza a quantidade, se a edição já estiver no carrinho */
export function upsertCartItem(
  userId: string,
  item: { nftId: string; editionId: string; quantity: number },
) {
  const newId = findCartItemByEdition(userId, item.editionId) ? null : db.nextId('cart-item')
  db.update((draft) => {
    const cart = (draft.carts[userId] ??= [])
    const existing = cart.find((i) => i.editionId === item.editionId)
    const now = new Date().toISOString()
    if (existing) {
      existing.quantity = item.quantity
      existing.addedAt = now
    } else {
      cart.push({ id: newId!, ...item, addedAt: now })
    }
  })
}
