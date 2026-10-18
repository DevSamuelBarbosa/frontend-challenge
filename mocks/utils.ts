// `import.meta.env` só existe no Vite. Fora dele (scripts em Node) usa o padrão.
const API_BASE_URL = import.meta.env?.VITE_API_URL ?? '/api'

/** Monta o caminho de um endpoint com a mesma base usada pelo cliente Axios */
export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`
}
