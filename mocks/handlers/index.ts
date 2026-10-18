import { http, HttpResponse } from 'msw'
import { apiUrl } from '../utils'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { favoriteHandlers } from './favorites'
import { nftHandlers } from './nfts'
import { quoteHandlers } from './quote'

export const handlers = [
  // Verificação rápida de que os mocks estão ativos
  http.get(apiUrl('/health'), () => HttpResponse.json({ status: 'ok', mocks: true })),
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
]
