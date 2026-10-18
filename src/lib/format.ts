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

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/** Data do recibo, como no design: "29 Jul, 2026" (usa o fuso do navegador) */
export function formatReceiptDate(iso: string) {
  const date = new Date(iso)
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`
}

/** Hash de transação abreviado, como no design: 0xA91F…E82C */
export function shortHash(hash: string, head = 6, tail = 4) {
  return hash.length <= head + tail + 1 ? hash : `${hash.slice(0, head)}…${hash.slice(-tail)}`
}
