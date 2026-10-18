import type { EthAmount, Nft, NftEdition } from '@/api/contracts'
import { db } from '../db'

type NftListener = (nft: Nft) => void
const listeners = new Set<NftListener>()

/** Avisa quando preço ou disponibilidade de um NFT mudam (usado pelos eventos em tempo real) */
export function onNftChanged(listener: NftListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Único ponto de alteração de preço e disponibilidade do catálogo. Incrementa a
 * versão do NFT e notifica os interessados.
 */
export function updateEditions(
  nftId: string,
  change: (edition: NftEdition) => Partial<NftEdition> | null,
) {
  const changed = db.update((draft) => {
    const nft = draft.nfts.find((n) => n.id === nftId)
    if (!nft) return null
    let touched = false
    for (const edition of nft.editions) {
      const patch = change(edition)
      if (patch) {
        Object.assign(edition, patch)
        touched = true
      }
    }
    if (!touched) return null
    nft.version += 1
    return structuredClone(nft)
  })
  if (changed) listeners.forEach((listener) => listener(changed))
  return changed
}

const pickEdition = (editionId?: string) => (edition: NftEdition) =>
  !editionId || edition.id === editionId

export function changePrice(nftId: string, priceEth: EthAmount, editionId?: string) {
  const matches = pickEdition(editionId)
  return updateEditions(nftId, (e) => (matches(e) ? { priceEth } : null))
}

export function setAvailability(nftId: string, available: number, editionId?: string) {
  const matches = pickEdition(editionId)
  return updateEditions(nftId, (e) => (matches(e) ? { available: Math.max(0, available) } : null))
}

/** Soma (ou subtrai) estoque de uma edição, usado na reserva e devolução de pedidos */
export function adjustAvailability(nftId: string, editionId: string, delta: number) {
  return updateEditions(nftId, (e) =>
    e.id === editionId ? { available: Math.max(0, e.available + delta) } : null,
  )
}
