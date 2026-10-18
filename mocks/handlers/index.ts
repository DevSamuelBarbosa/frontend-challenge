import { HttpResponse } from 'msw'
import { api } from '../lib/http'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { favoriteHandlers } from './favorites'
import { nftHandlers } from './nfts'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { quoteHandlers } from './quote'
import { walletHandlers } from './wallets'

export const handlers = [
  // Verificação rápida de que os mocks estão ativos
  api.get('/health', () => HttpResponse.json({ status: 'ok', mocks: true })),
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
]
