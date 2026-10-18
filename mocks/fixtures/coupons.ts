import type { Coupon, EthAmount } from '@/api/contracts'

export interface MockCoupon extends Coupon {
  expiresAt: string
  /** Subtotal mínimo para aplicar o cupom */
  minSubtotalEth: EthAmount
}

/*
 * BEMVINDO10  10% de desconto, válido
 * NFT005      0.005 ETH de desconto para subtotal a partir de 0.1 ETH, válido
 * VERAO25     25% de desconto, expirado
 * Qualquer outro código é inválido.
 */
export const coupons: MockCoupon[] = [
  {
    code: 'BEMVINDO10',
    description: '10% de desconto na primeira compra',
    type: 'percent',
    value: '10',
    minSubtotalEth: '0',
    expiresAt: '2099-12-31T23:59:59.000Z',
  },
  {
    code: 'NFT005',
    description: '0.005 ETH de desconto em compras a partir de 0.1 ETH',
    type: 'fixed',
    value: '0.005',
    minSubtotalEth: '0.1',
    expiresAt: '2099-12-31T23:59:59.000Z',
  },
  {
    code: 'VERAO25',
    description: '25% de desconto da campanha de verão',
    type: 'percent',
    value: '25',
    minSubtotalEth: '0',
    expiresAt: '2026-03-20T23:59:59.000Z',
  },
]
