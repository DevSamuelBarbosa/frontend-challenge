import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'

/*
 * POST /auth/register  RegisterRequest -> Session  (409 se o e-mail já existir)
 * POST /auth/login     LoginRequest    -> Session  (401 se as credenciais forem inválidas)
 * GET  /auth/session                   -> Session  (401 se a sessão for inválida ou expirada)
 * POST /auth/logout                    -> 204
 */

export const userSchema = z.object({
  id: idSchema,
  name: z.string(),
  username: z.string(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
  createdAt: isoDateSchema,
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: isoDateSchema,
  user: userSchema,
})
export type Session = z.infer<typeof sessionSchema>

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Za-z]/, 'A senha deve conter pelo menos uma letra')
  .regex(/\d/, 'A senha deve conter pelo menos um número')

export const loginRequestSchema = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe sua senha'),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const registerRequestSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{3,20}$/, 'Use de 3 a 20 caracteres: letras minúsculas, números ou _'),
  email: z.email('Informe um e-mail válido'),
  password: passwordSchema,
})
export type RegisterRequest = z.infer<typeof registerRequestSchema>
