import { http, HttpResponse } from 'msw'
import { apiUrl } from '../utils'
import { authHandlers } from './auth'
import { nftHandlers } from './nfts'

export const handlers = [
  // Verificação rápida de que os mocks estão ativos
  http.get(apiUrl('/health'), () => HttpResponse.json({ status: 'ok', mocks: true })),
  ...authHandlers,
  ...nftHandlers,
]
