import type { z } from 'zod'
import { ApiError } from './errors'

/**
 * Valida a resposta da API com o schema do contrato. Uma resposta fora do
 * contrato vira um ApiError, em vez de dados inválidos chegando à interface.
 */
export function parseResponse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  throw new ApiError({
    code: 'unknown',
    message: 'Resposta inesperada do servidor',
    details: { issues: result.error.issues },
    cause: result.error,
  })
}
