import axios from 'axios'
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config'
import { toApiError } from './errors'
import { sessionToken } from './session-token'

/** Instância única do Axios usada por todas as chamadas REST */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = sessionToken.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Toda falha sai da camada de transporte como ApiError
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    const sentToken = bearerToken(error)

    // Sessão recusada pela API: avisa a aplicação para limpar os dados privados.
    // Só vale se o token enviado ainda é o atual (evita reagir a respostas antigas).
    if (apiError.code === 'unauthorized' && sentToken && sentToken === sessionToken.get()) {
      const reason = apiError.details.reason
      if (reason === 'session_expired' || reason === 'session_invalid') sessionToken.end(reason)
    }
    return Promise.reject(apiError)
  },
)

/** Token enviado na requisição que falhou, se houver */
function bearerToken(error: unknown) {
  if (!axios.isAxiosError(error)) return null
  const header = error.config?.headers?.Authorization
  return typeof header === 'string' && header.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : null
}
