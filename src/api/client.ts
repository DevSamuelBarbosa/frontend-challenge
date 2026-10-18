import axios from 'axios'
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config'
import { toApiError } from './errors'

/** Instância única do Axios usada por todas as chamadas REST */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// Toda falha sai da camada de transporte como ApiError
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)
