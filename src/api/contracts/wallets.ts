import { z } from 'zod'
import { idSchema, isoDateSchema, networkSchema } from './common'

/*
 * Requer autenticação.
 * GET   /wallets                                  -> Wallet[]
 * POST  /wallets             CreateWalletRequest  -> Wallet (409 se a função já estiver ocupada)
 * PATCH /wallets/:walletId   UpdateWalletRequest  -> Wallet
 */

export const walletProviderSchema = z.enum(['metamask', 'coinbase', 'walletconnect', 'phantom'])
export type WalletProvider = z.infer<typeof walletProviderSchema>

/** Cada colecionador tem no máximo uma carteira principal e uma secundária */
export const walletRoleSchema = z.enum(['primary', 'secondary'])
export type WalletRole = z.infer<typeof walletRoleSchema>

export const walletAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Informe um endereço válido (0x seguido de 40 caracteres)')

export const walletSchema = z.object({
  id: idSchema,
  role: walletRoleSchema,
  label: z.string(),
  provider: walletProviderSchema,
  address: walletAddressSchema,
  networks: z.array(networkSchema).min(1),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})
export type Wallet = z.infer<typeof walletSchema>

export const createWalletRequestSchema = z.object({
  role: walletRoleSchema,
  label: z.string().trim().min(2, 'Informe um nome para a carteira').max(40),
  provider: walletProviderSchema,
  address: walletAddressSchema,
  networks: z.array(networkSchema).min(1, 'Selecione pelo menos uma rede'),
})
export type CreateWalletRequest = z.infer<typeof createWalletRequestSchema>

export const updateWalletRequestSchema = createWalletRequestSchema.omit({ role: true }).partial()
export type UpdateWalletRequest = z.infer<typeof updateWalletRequestSchema>
