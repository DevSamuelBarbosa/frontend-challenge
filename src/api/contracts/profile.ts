import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'
import { passwordSchema } from './auth'
import { ensNameSchema } from './identity'

/*
 * Requer autenticação.
 * GET   /profile                                   -> Profile
 * PATCH /profile           UpdateProfileRequest    -> Profile (409 se o username já existir)
 * PUT   /profile/avatar    multipart (campo `file`) -> Profile (400 se o tipo ou tamanho for inválido)
 * DELETE /profile/avatar                            -> Profile
 * PUT   /profile/password  ChangePasswordRequest   -> 204 (400 se a senha atual estiver errada;
 *                                                    as outras sessões do usuário são encerradas)
 */

export const profileSchema = z.object({
  id: idSchema,
  name: z.string(),
  username: z.string(),
  email: z.email(),
  bio: z.string(),
  /** Nome ENS do colecionador, ex.: "ana.eth". Vazio enquanto não informado. */
  ensName: z.string(),
  avatarUrl: z.string().nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})
export type Profile = z.infer<typeof profileSchema>

export const updateProfileRequestSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{3,20}$/, 'Use de 3 a 20 caracteres: letras minúsculas, números ou _'),
  email: z.email('Informe um e-mail válido'),
  ensName: ensNameSchema,
  /** A tela de perfil não edita a bio: sem ela, o valor atual é mantido */
  bio: z.string().trim().max(280, 'A bio deve ter no máximo 280 caracteres').optional(),
})
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export const changePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe sua senha atual'),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual',
  })
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>
