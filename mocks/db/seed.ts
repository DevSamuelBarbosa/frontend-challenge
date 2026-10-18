import { coupons, favorites, nfts, users, wallets } from '../fixtures'
import type { MockState } from './types'

export const SCHEMA_VERSION = 4

/** Estado inicial conhecido, sempre montado a partir de cópias das fixtures */
export function createSeedState(): MockState {
  return structuredClone({
    schemaVersion: SCHEMA_VERSION,
    sequence: 0,
    users,
    sessions: [],
    nfts,
    favorites,
    carts: Object.fromEntries(users.map((user) => [user.id, []])),
    quotes: [],
    orders: [],
    wallets,
    walletConnections: [],
    coupons,
  })
}
