import { http, HttpResponse } from 'msw'
import { apiUrl } from '../utils'
import { authHandlers } from './auth'

export const handlers = [
  // Verificação rápida de que os mocks estão ativos
  http.get(apiUrl('/health'), () => HttpResponse.json({ status: 'ok', mocks: true })),
  ...authHandlers,
]
