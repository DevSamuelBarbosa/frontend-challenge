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
 *   - carteira não conectada na rede do pedido: 409 com o código `wallet_not_connected`
 * GET  /orders?status                                      -> Order[] (mais recentes primeiro)
 * GET  /orders/:orderId                                     -> Order
 */

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'rejected'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

const ENS_NAME = /^[a-z0-9-]{3,63}\.eth$/
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export const ensNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe o nome ENS')
  .regex(ENS_NAME, 'Use um nome ENS válido, com 3 a 63 letras, números ou -, terminando em .eth')

/** Destino opcional dos NFTs: endereço 0x, endereço Solana ou nome ENS. Vazio = a própria carteira. */
export const secondaryWalletSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === '' ||
      ENS_NAME.test(value.toLowerCase()) ||
      EVM_ADDRESS.test(value) ||
      SOLANA_ADDRESS.test(value),
    'Informe um endereço 0x, um endereço Solana ou um nome ENS (.eth)',
  )

/** Dados do colecionador no pedido (a seção "Perfil do colecionador" do pagamento) */
export const collectorSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Informe o nome de exibição')
    .max(60, 'Use no máximo 60 caracteres'),
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{3,20}$/, 'Use de 3 a 20 caracteres: letras minúsculas, números ou _'),
  profileName: z
    .string()
    .trim()
    .min(2, 'Informe o nome do perfil')
    .max(60, 'Use no máximo 60 caracteres'),
  email: z.email('Informe um e-mail válido'),
  referralCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{3,20}$/, 'Informe o código de indicação (3 a 20 letras, números ou -)'),
  ensName: ensNameSchema,
  secondaryWallet: secondaryWalletSchema,
  note: z.string().trim().max(280, 'A observação deve ter no máximo 280 caracteres'),
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
