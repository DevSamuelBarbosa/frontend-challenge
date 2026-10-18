import { z } from 'zod'
import { ethAmountSchema, idSchema, isoDateSchema, networkSchema } from './common'
import { couponSchema, quoteLineSchema } from './quote'
import { walletProviderSchema } from './wallets'

/*
 * Requer autenticação.
 * POST /orders  CreateOrderRequest + header Idempotency-Key -> Order
 *   - mesma chave e mesmo conteúdo: devolve o pedido já criado
 *   - mesma chave e conteúdo diferente: 409
 *   - cotação divergente do catálogo: 409 com o código `quote_outdated`
 * GET  /orders?status                                      -> Order[] (mais recentes primeiro)
 * GET  /orders/:orderId                                     -> Order
 */

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'rejected'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const collectorSchema = z.object({
  fullName: z.string().trim().min(2, 'Informe seu nome completo'),
  email: z.email('Informe um e-mail válido'),
  country: z.string().trim().min(2, 'Informe seu país'),
})
export type Collector = z.infer<typeof collectorSchema>

export const createOrderRequestSchema = z.object({
  quoteId: idSchema,
  walletId: idSchema,
  network: networkSchema,
  collector: collectorSchema,
})
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>

export const transactionSchema = z.object({
  hash: z.string(),
  explorerUrl: z.string(),
})
export type Transaction = z.infer<typeof transactionSchema>

/** O pedido guarda um snapshot da cotação: mudanças no catálogo não alteram o recibo */
export const orderSchema = z.object({
  id: idSchema,
  status: orderStatusSchema,
  network: networkSchema,
  collector: collectorSchema,
  wallet: z.object({
    id: idSchema,
    label: z.string(),
    provider: walletProviderSchema,
    address: z.string(),
  }),
  lines: z.array(quoteLineSchema),
  coupon: couponSchema.nullable(),
  subtotalEth: ethAmountSchema,
  discountEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  totalEth: ethAmountSchema,
  transaction: transactionSchema.nullable(),
  rejectionReason: z.string().nullable(),
  version: z.number().int().nonnegative(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})
export type Order = z.infer<typeof orderSchema>

export const orderListSchema = z.array(orderSchema)
export type OrderList = z.infer<typeof orderListSchema>
