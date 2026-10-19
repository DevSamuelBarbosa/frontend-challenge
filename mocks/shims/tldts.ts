/**
 * Substitui o `tldts` no build (ver `vite.config.ts`). O MSW usa o `tough-cookie` para o
 * armazenamento de cookies, e o `tough-cookie` usa o `tldts` (lista de sufixos públicos,
 * ~150 KB) só para validar o domínio de cookies. Esta aplicação autentica por token e não usa
 * cookies, então basta devolver o domínio registrável sem consultar a lista.
 */
export function getDomain(host: string | null | undefined) {
  if (!host) return null
  const labels = host.split('.')
  return labels.length <= 2 ? host : labels.slice(-2).join('.')
}
