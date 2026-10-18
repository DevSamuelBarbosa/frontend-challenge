import { createFileRoute, redirect } from '@tanstack/react-router'
import { authSearchSchema } from '@/lib/redirect'
import { sessionQueryOptions } from '@/queries/session'

export const Route = createFileRoute('/register')({
  validateSearch: authSearchSchema,
  // Quem já está autenticado volta direto para o destino
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (session) throw redirect({ href: search.redirect ?? '/', replace: true })
  },
  component: RegisterPage,
})

function RegisterPage() {
  const { reason } = Route.useSearch()
  return (
    <>
      <h1 className="text-2xl font-bold">Cadastro</h1>
      {reason === 'session_expired' && (
        <p role="alert">Sua sessão expirou. Entre novamente para continuar de onde parou.</p>
      )}
    </>
  )
}
