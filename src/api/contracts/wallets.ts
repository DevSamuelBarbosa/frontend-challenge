import { z } from 'zod'
import { secondaryWalletSchema } from './identity'
import { idSchema, isoDateSchema, networkSchema } from './common'

/*
 * Requer autenticação.
 * GET   /wallets                                  -> Wallet[]
 * POST  /wallets             CreateWalletRequest  -> Wallet (409 se a função já estiver ocupada)
 * PATCH /wallets/:walletId   UpdateWalletRequest  -> Wallet
 *
 * Conexão simulada da carteira (não há extensão real): exigida para criar pedidos.
 * POST   /wallets/:walletId/connection  ConnectWalletRequest -> WalletConnection
 *        (403 `wallet_rejected` se o usuário recusar na carteira; 400 se a rede não for suportada)
 * DELETE /wallets/:walletId/connection                       -> 204
 */

export const walletProviderSchema = z.enum(['metamask', 'coinbase', 'walletconnect', 'phantom'], {
  error: 'Selecione o tipo de carteira',
})
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
  /** Dados do colecionador cadastrados junto da carteira (tela Carteiras) */
  profileName: z.string(),
  referralCode: z.string(),
  /** ENS ou carteira secundária que recebe os NFTs. Vazio = a própria carteira. */
  secondaryTarget: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})
export type Wallet = z.infer<typeof walletSchema>

export const createWalletRequestSchema = z.object({
  role: walletRoleSchema,
  label: z.string().trim().min(2, 'Informe um nome para a carteira').max(40),
  provider: walletProviderSchema,
  address: walletAddressSchema,
  networks: z.array(networkSchema).min(1, 'Selecione uma rede'),
  profileName: z
    .string()
    .trim()
    .min(2, 'Informe o nome do perfil')
    .max(60, 'Use no máximo 60 caracteres'),
  referralCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{3,20}$/, 'Informe o código de indicação (3 a 20 letras, números ou -)'),
  secondaryTarget: secondaryWalletSchema,
})
export type CreateWalletRequest = z.infer<typeof createWalletRequestSchema>

export const updateWalletRequestSchema = createWalletRequestSchema.omit({ role: true }).partial()
export type UpdateWalletRequest = z.infer<typeof updateWalletRequestSchema>

export const connectWalletRequestSchema = z.object({ network: networkSchema })
export type ConnectWalletRequest = z.infer<typeof connectWalletRequestSchema>

export const walletConnectionSchema = z.object({
  walletId: idSchema,
  network: networkSchema,
  connectedAt: isoDateSchema,
})
export type WalletConnection = z.infer<typeof walletConnectionSchema>
