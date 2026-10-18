import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthScreen } from '@/features/auth/components/auth-screen'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { authSearchSchema } from '@/lib/redirect'
import { sessionQueryOptions } from '@/queries/session'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  // Quem já está autenticado volta direto para o destino
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (session) throw redirect({ href: search.redirect ?? '/', replace: true })
  },
  component: LoginPage,
})

function LoginPage() {
  const { redirect, reason } = Route.useSearch()
  useDocumentTitle('Entrar')
  return <AuthScreen mode="login" redirect={redirect} reason={reason} />
}
