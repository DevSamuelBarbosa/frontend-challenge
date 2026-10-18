import { z } from 'zod'
import { ethAmountSchema, idSchema, imageSchema, isoDateSchema, quantitySchema } from './common'

/*
 * O dono do carrinho é o usuário da sessão (Bearer) ou, para visitantes, o id
 * anônimo enviado no cabeçalho `X-Guest-Cart-Id`. As regras de disponibilidade
 * ficam todas na API, valendo para os dois casos.
 * GET    /cart                                      -> Cart
 * POST   /cart/items          AddCartItemRequest    -> Cart (409 se exceder a disponibilidade)
 * PATCH  /cart/items/:itemId  UpdateCartItemRequest -> Cart
 * DELETE /cart/items/:itemId                       -> Cart
 * POST   /cart/merge          MergeCartRequest      -> Cart (requer sessão; junta o carrinho do
 *                                                      visitante ao da conta e o descarta)
 */

export const GUEST_CART_HEADER = 'X-Guest-Cart-Id'
export const guestCartIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/)

export const cartItemSchema = z.object({
  id: idSchema,
  nftId: idSchema,
  editionId: idSchema,
  quantity: quantitySchema,
  /** Dados atuais do catálogo, para exibição. O valor final vem sempre da cotação. */
  name: z.string(),
  editionName: z.string(),
  image: imageSchema,
  unitPriceEth: ethAmountSchema,
  available: z.number().int().nonnegative(),
  maxPerOrder: z.number().int().positive(),
  nftVersion: z.number().int().nonnegative(),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  updatedAt: isoDateSchema,
})
export type Cart = z.infer<typeof cartSchema>

export const addCartItemRequestSchema = z.object({
  nftId: idSchema,
  editionId: idSchema,
  quantity: quantitySchema,
})
export type AddCartItemRequest = z.infer<typeof addCartItemRequestSchema>

export const updateCartItemRequestSchema = z.object({ quantity: quantitySchema })
export type UpdateCartItemRequest = z.infer<typeof updateCartItemRequestSchema>

export const mergeCartRequestSchema = z.object({
  guestCartId: guestCartIdSchema,
})
export type MergeCartRequest = z.infer<typeof mergeCartRequestSchema>
