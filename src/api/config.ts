/** URL base da API REST */
export const API_BASE_URL = import.meta.env?.VITE_API_URL ?? '/api'

/** Tempo limite de cada requisição. Os cenários de timeout dos mocks usam este valor. */
export const REQUEST_TIMEOUT_MS = 10_000
