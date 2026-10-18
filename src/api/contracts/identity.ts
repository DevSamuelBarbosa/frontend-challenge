import { z } from 'zod'

/** Nome ENS e destinos de entrega, compartilhados por pedido, perfil e carteiras */
export const ENS_NAME = /^[a-z0-9-]{3,63}\.eth$/
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
