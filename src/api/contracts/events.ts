import { z } from 'zod'
import { ethAmountSchema, idSchema, isoDateSchema } from './common'
import { nftEditionSchema } from './nfts'
import { orderSchema } from './orders'

/*
 * Eventos em tempo real (Socket.IO, servidor -> cliente).
 *
 * Todo evento tem identidade estável (`id`), o recurso afetado e a versão do
 * recurso. O mesmo `id` pode chegar mais de uma vez (duplicata) e versões antigas
 * podem chegar depois das novas: o cliente deve ignorar eventos com versão menor ou
 * igual à que já conhece.
 *
 * `nft.updated`      público: preço e disponibilidade de um NFT mudaram
 * `order.updated`    privado (só para o dono): o estado de um pedido mudou
 * `session.invalid`  a sessão usada na conexão não é mais válida
 */

export const REALTIME_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
  sessionInvalid: 'session.invalid',
} as const

function eventSchema<T extends string, R extends string, D extends z.ZodType>(
  type: T,
  resource: R,
  data: D,
) {
  return z.object({
    /** `<recurso>:<id>:v<versão>`: igual para duplicatas do mesmo evento */
    id: z.string(),
    type: z.literal(type),
    resource: z.object({ type: z.literal(resource), id: idSchema }),
    version: z.number().int().nonnegative(),
    occurredAt: isoDateSchema,
    data,
  })
}

export const nftUpdatedEventSchema = eventSchema(
  REALTIME_EVENTS.nftUpdated,
  'nft',
  z.object({
    nftId: idSchema,
    /** Menor preço e disponibilidade total, como no resumo do catálogo */
    priceEth: ethAmountSchema,
    compareAtPriceEth: ethAmountSchema.nullable(),
    available: z.number().int().nonnegative(),
    editions: z.array(
      nftEditionSchema.pick({
        id: true,
        priceEth: true,
        compareAtPriceEth: true,
        available: true,
        maxPerOrder: true,
      }),
    ),
  }),
)
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = eventSchema(
  REALTIME_EVENTS.orderUpdated,
  'order',
  orderSchema,
)
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const sessionInvalidEventSchema = z.object({
  reason: z.enum(['session_invalid', 'session_expired']),
})
export type SessionInvalidEvent = z.infer<typeof sessionInvalidEventSchema>

export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent
