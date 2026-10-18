import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionToken } from '@/api/session-token'
import { sessionQueryOptions } from '@/queries/session'

/**
 * Layout das rotas privadas: sem sessão, redireciona para o login guardando o
 * endereço completo (caminho e busca) para retomar o fluxo depois.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href, reason: sessionToken.takeEndReason() ?? undefined },
        replace: true,
      })
    }
    return { session }
  },
  component: Outlet,
})
