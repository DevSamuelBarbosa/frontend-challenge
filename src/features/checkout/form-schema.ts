import { z } from 'zod'
import { collectorSchema, networkSchema, type WalletProvider } from '@/api/contracts'

/**
 * Formulário de pagamento: os dados do colecionador (iguais aos do pedido), a carteira
 * cadastrada escolhida, a rede e o destino dos NFTs. Os mesmos campos são validados de
 * novo pela API, que devolve os erros por campo.
 */
export const checkoutFormSchema = z
  .object({
    collector: collectorSchema,
    walletId: z.string().min(1, 'Selecione uma carteira'),
    network: networkSchema,
    deliverToOther: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.deliverToOther && !value.collector.secondaryWallet.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['collector', 'secondaryWallet'],
        message: 'Informe a carteira ou o nome ENS que vai receber os NFTs',
      })
    }
  })

export type CheckoutFormInput = z.input<typeof checkoutFormSchema>
export type CheckoutFormOutput = z.output<typeof checkoutFormSchema>

export const PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
  phantom: 'Phantom',
}
