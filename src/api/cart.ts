import { type AddCartItemRequest, type Cart, cartSchema } from './contracts'
import { api } from './client'
import { parseResponse } from './parse'

export async function getCart(signal?: AbortSignal): Promise<Cart> {
  const { data } = await api.get('/cart', { signal })
  return parseResponse(cartSchema, data)
}

export async function addCartItem(body: AddCartItemRequest): Promise<Cart> {
  const { data } = await api.post('/cart/items', body)
  return parseResponse(cartSchema, data)
}

export async function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  const { data } = await api.patch(`/cart/items/${encodeURIComponent(itemId)}`, { quantity })
  return parseResponse(cartSchema, data)
}

export async function removeCartItem(itemId: string): Promise<Cart> {
  const { data } = await api.delete(`/cart/items/${encodeURIComponent(itemId)}`)
  return parseResponse(cartSchema, data)
}

export async function mergeGuestCart(guestCartId: string): Promise<Cart> {
  const { data } = await api.post('/cart/merge', { guestCartId })
  return parseResponse(cartSchema, data)
}
