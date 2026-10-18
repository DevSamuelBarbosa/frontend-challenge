import {
  mutationOptions,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import * as authApi from '@/api/auth'
import type { Session } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { sessionToken } from '@/api/session-token'
import { queryKeys } from './keys'

/**
 * Sessão atual. Sem token, resolve `null` sem chamar a API. Um 401 também
 * resolve `null`: "não autenticado" é um estado válido, não um erro.
 */
export const sessionQueryOptions = queryOptions({
  queryKey: queryKeys.session,
  queryFn: async ({ signal }): Promise<Session | null> => {
    if (!sessionToken.get()) return null
    try {
      return await authApi.getSession(signal)
    } catch (error) {
      if (isApiError(error) && error.code === 'unauthorized') return null
      throw error
    }
  },
  staleTime: 5 * 60 * 1000,
})

export function useSession() {
  const query = useQuery(sessionQueryOptions)
  return { ...query, session: query.data ?? null, user: query.data?.user ?? null }
}

/** Remove do cache todos os dados privados (de qualquer usuário) */
export async function clearPrivateData(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: queryKeys.user.all })
  queryClient.removeQueries({ queryKey: queryKeys.user.all })
}

/** Aplica uma sessão nova: troca o token e limpa o cache do usuário anterior */
async function startSession(queryClient: QueryClient, session: Session) {
  const previous = queryClient.getQueryData<Session | null>(queryKeys.session)
  if (previous && previous.user.id !== session.user.id) await clearPrivateData(queryClient)
  // A sessão entra no cache antes do token, para o sincronizador reconhecê-lo
  queryClient.setQueryData(queryKeys.session, session)
  sessionToken.set(session.token)
}

export async function endSession(queryClient: QueryClient) {
  queryClient.setQueryData(queryKeys.session, null)
  await clearPrivateData(queryClient)
  sessionToken.set(null)
}

export const loginMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: authApi.login,
    onSuccess: (session) => startSession(queryClient, session),
  })

export const registerMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: authApi.register,
    onSuccess: (session) => startSession(queryClient, session),
  })

export const logoutMutationOptions = (queryClient: QueryClient) =>
  mutationOptions({
    // Mesmo se a API falhar, a sessão local é encerrada
    mutationFn: () => authApi.logout().catch(() => undefined),
    onSettled: () => endSession(queryClient),
  })

export const useLogin = () => useMutation(loginMutationOptions(useQueryClient()))
export const useRegister = () => useMutation(registerMutationOptions(useQueryClient()))
export const useLogout = () => useMutation(logoutMutationOptions(useQueryClient()))

/**
 * Mantém o cache em sincronia com o token: sessão encerrada pela API (401),
 * logout ou login em outra aba. Retorna a função para cancelar a inscrição.
 */
export function syncSessionWithToken(queryClient: QueryClient) {
  return sessionToken.subscribe((event) => {
    const current = queryClient.getQueryData<Session | null>(queryKeys.session)
    if (event.type === 'ended' || (event.type === 'changed' && !event.token)) {
      void clearPrivateData(queryClient)
      queryClient.setQueryData(queryKeys.session, null)
      return
    }
    // Outra aba entrou com outro token: busca a sessão correspondente
    if (event.type === 'changed' && event.token !== current?.token) {
      void clearPrivateData(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.session })
    }
  })
}
