import { z } from 'zod'
import { ethAmountSchema, idSchema, isoDateSchema, networkSchema, quantitySchema } from './common'

/*
 * Requer autenticação. A cotação é a referência de valores para finalizar o pedido.
 * POST /quote  QuoteRequest -> Quote
 */

export const quoteRequestSchema = z.object({
  network: networkSchema,
  couponCode: z.string().trim().min(1).optional(),
})
export type QuoteRequest = z.infer<typeof quoteRequestSchema>

export const quoteLineSchema = z.object({
  cartItemId: idSchema,
  nftId: idSchema,
  editionId: idSchema,
  name: z.string(),
  editionName: z.string(),
  quantity: quantitySchema,
  unitPriceEth: ethAmountSchema,
  lineTotalEth: ethAmountSchema,
  nftVersion: z.number().int().nonnegative(),
})
export type QuoteLine = z.infer<typeof quoteLineSchema>

export const couponSchema = z.object({
  code: z.string(),
  description: z.string(),
  type: z.enum(['percent', 'fixed']),
  /** Percentual (ex.: "10") ou valor fixo em ETH */
  value: z.string(),
})
export type Coupon = z.infer<typeof couponSchema>

export const couponErrorSchema = z.object({
  code: z.string(),
  reason: z.enum(['invalid', 'expired', 'not_applicable']),
  message: z.string(),
})
export type CouponError = z.infer<typeof couponErrorSchema>

/** Divergências entre o carrinho e o catálogo detectadas na cotação */
export const quoteIssueSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('price_changed'),
    cartItemId: idSchema,
    previousPriceEth: ethAmountSchema,
    currentPriceEth: ethAmountSchema,
  }),
  z.object({
    type: z.literal('quantity_reduced'),
    cartItemId: idSchema,
    requested: quantitySchema,
    available: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('sold_out'),
    cartItemId: idSchema,
  }),
])
export type QuoteIssue = z.infer<typeof quoteIssueSchema>

export const quoteSchema = z.object({
  id: idSchema,
  network: networkSchema,
  lines: z.array(quoteLineSchema),
  coupon: couponSchema.nullable(),
  couponError: couponErrorSchema.nullable(),
  issues: z.array(quoteIssueSchema),
  subtotalEth: ethAmountSchema,
  discountEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  totalEth: ethAmountSchema,
  createdAt: isoDateSchema,
  expiresAt: isoDateSchema,
})
export type Quote = z.infer<typeof quoteSchema>
