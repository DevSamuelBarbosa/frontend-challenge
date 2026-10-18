import type { Cart, CartItem } from '@/api/contracts'
import { db } from '../db'
import { findEdition } from './catalog'

/** Chave do carrinho de visitante no banco, separada dos ids de usuário */
export const guestCartKey = (guestCartId: string) => `guest:${guestCartId}`

/** Monta o carrinho com os dados atuais do catálogo. `owner` é o id do usuário ou a chave do visitante. */
export function toCart(owner: string): Cart {
  const items = db.state.carts[owner] ?? []
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

export function findCartItemByEdition(owner: string, editionId: string) {
  return db.state.carts[owner]?.find((i) => i.editionId === editionId)
}

/** Cria o item ou atualiza a quantidade, se a edição já estiver no carrinho */
export function upsertCartItem(
  owner: string,
  item: { nftId: string; editionId: string; quantity: number },
) {
  const newId = findCartItemByEdition(owner, item.editionId) ? null : db.nextId('cart-item')
  db.update((draft) => {
    const cart = (draft.carts[owner] ??= [])
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
