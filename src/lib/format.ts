import type { EthAmount } from '@/api/contracts'
import { eth } from './eth'

/**
 * Valor em ETH como no design ("1.19 ETH", "0.016 ETH"): ao menos 2 casas e
 * nenhuma casa significativa cortada, para a apresentação manter a precisão.
 */
export function formatEth(value: EthAmount, { unit = true }: { unit?: boolean } = {}) {
  const [integer, decimals = ''] = eth(value).toFixed().split('.')
  const trimmed = decimals.replace(/0+$/, '').padEnd(2, '0')
  return `${integer}.${trimmed}${unit ? ' ETH' : ''}`
}

/** Faixa de preço do filtro, no formato do design: "0,02 - 12,30 ETH" */
export function formatPriceRange(min: EthAmount, max: EthAmount) {
  const pt = (value: EthAmount) => formatEth(value, { unit: false }).replace('.', ',')
  return `${pt(min)} - ${pt(max)} ETH`
}

/** Endereço abreviado como no design: 0x7A42...19E8 */
export function shortAddress(address: string, head = 6, tail = 4) {
  return address.length <= head + tail + 3
    ? address
    : `${address.slice(0, head)}...${address.slice(-tail)}`
}
