import { API_BASE_URL } from '@/api/config'

/** Monta o caminho de um endpoint com a mesma base usada pelo cliente Axios */
export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`
}

/** Caminho relativo à base da API, ex.: `/api/nfts/1` -> `/nfts/1` */
export function apiPath(url: string) {
  const { pathname } = new URL(url)
  return pathname.startsWith(API_BASE_URL) ? pathname.slice(API_BASE_URL.length) : pathname
}
