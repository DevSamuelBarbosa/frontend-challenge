import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { mergeGuestCartIntoAccount } from '@/queries/cart'
import { queryKeys } from '@/queries/keys'
import { useSession } from '@/queries/session'

/** Maior atraso aceito pelo setTimeout (cerca de 24,8 dias) */
const MAX_TIMEOUT_MS = 2 ** 31 - 1

/**
 * Reage a mudanças de sessão durante a navegação:
 * - login, logout, expiração ou troca de usuário (inclusive em outra aba):
 *   revalida a rota atual, e as rotas privadas redirecionam para o login
 *   guardando o endereço;
 * - ao autenticar, junta o carrinho do visitante ao da conta;
 * - ao chegar o horário de expiração, revalida a sessão mesmo sem interação.
 */
export function SessionWatcher() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { session, isPending } = useSession()

  const token = session?.token ?? null
  const previousToken = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (isPending) return
    // Primeira resolução da sessão: as rotas já foram carregadas com ela
    if (previousToken.current === undefined) {
      previousToken.current = token
      return
    }
    if (previousToken.current === token) return
    previousToken.current = token
    void router.invalidate()
  }, [isPending, token, router])

  // Ao autenticar (ou ao abrir já autenticado), junta o carrinho do visitante
  const userId = session?.user.id
  useEffect(() => {
    if (userId) void mergeGuestCartIntoAccount(queryClient, userId)
  }, [userId, queryClient])

  const expiresAt = session?.expiresAt
  useEffect(() => {
    if (!expiresAt) return
    const delay = Math.min(Math.max(0, Date.parse(expiresAt) - Date.now()), MAX_TIMEOUT_MS)
    const timer = setTimeout(
      () => void queryClient.invalidateQueries({ queryKey: queryKeys.session }),
      delay,
    )
    return () => clearTimeout(timer)
  }, [expiresAt, queryClient])

  return null
}
