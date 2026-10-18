import axios from 'axios'
import { toApiError } from './errors'

/** Instância única do Axios usada por todas as chamadas REST */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10_000,
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
