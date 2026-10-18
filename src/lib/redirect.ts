import { z } from 'zod'

/**
 * Aceita apenas caminhos internos (`/checkout?x=1`), para o parâmetro de retorno
 * não virar um redirecionamento para outro site (`//evil.com`, `https://...`).
 */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined
  return value
}

/** Parâmetros de busca das telas de login e cadastro */
export const authSearchSchema = z.object({
  redirect: z.unknown().transform(safeRedirect).optional(),
  reason: z.enum(['session_expired', 'session_invalid']).optional().catch(undefined),
})
export type AuthSearch = z.infer<typeof authSearchSchema>
