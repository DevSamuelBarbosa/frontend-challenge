import Big from 'big.js'
import type { EthAmount } from '@/api/contracts'

/** Valores em ETH têm até 18 casas decimais (wei) */
export const ETH_DECIMALS = 18

// Instância própria para não alterar a configuração global do big.js
const EthBig = Big()
EthBig.DP = ETH_DECIMALS
EthBig.RM = EthBig.roundDown

export function eth(value: EthAmount | number) {
  return new EthBig(value)
}

/** Converte de volta para string decimal sem notação científica */
export function toEthAmount(value: Big): EthAmount {
  return value.round(ETH_DECIMALS, EthBig.roundDown).toFixed()
}

export function compareEth(a: EthAmount, b: EthAmount) {
  return eth(a).cmp(eth(b))
}

export function minEth(values: EthAmount[]): EthAmount {
  return values.reduce((min, value) => (compareEth(value, min) < 0 ? value : min))
}

/** Valor × quantidade inteira, em decimal exato. Ex.: mulEth('0.12', 3) = '0.36' */
export function mulEth(amount: EthAmount, quantity: number): EthAmount {
  return toEthAmount(eth(amount).times(quantity))
}
