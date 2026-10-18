import { z } from 'zod'

/**
 * Valores em ETH trafegam como string decimal (até 18 casas) para não perder
 * precisão com ponto flutuante. Ex.: "0.125", "12", "0.000000000000000001".
 */
export const ethAmountSchema = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')
export type EthAmount = z.infer<typeof ethAmountSchema>

export const idSchema = z.string().min(1)
export const isoDateSchema = z.iso.datetime({ offset: true })

/** Quantidades são sempre inteiras e positivas */
export const quantitySchema = z.number().int().positive()

export const networkSchema = z.enum(['ethereum', 'polygon', 'base'])
export type Network = z.infer<typeof networkSchema>

export const imageSchema = z.object({
  url: z.string(),
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})
export type Image = z.infer<typeof imageSchema>

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
}
export type Paginated<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
