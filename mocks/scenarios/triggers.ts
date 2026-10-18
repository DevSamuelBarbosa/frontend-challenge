import { eth, toEthAmount } from '@/lib/eth'
import { db } from '../db'
import { findEdition } from '../lib/catalog'
import { changePrice, setAvailability } from '../lib/mutations'
import type { ScenarioTrigger } from './types'

/** Executa a alteração do gatilho sobre o primeiro item do carrinho do usuário */
export function runTrigger(action: ScenarioTrigger['action'], userId: string) {
  const item = db.state.carts[userId]?.[0]
  if (!item) return
  const found = findEdition(db.state.nfts, item.nftId, item.editionId)
  if (!found) return

  if (action === 'price_increase') {
    const newPrice = toEthAmount(eth(found.edition.priceEth).times('1.1'))
    changePrice(item.nftId, newPrice, item.editionId)
  } else {
    setAvailability(item.nftId, 0, item.editionId)
  }
}
