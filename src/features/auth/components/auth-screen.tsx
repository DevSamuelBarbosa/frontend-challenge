import { Link, useNavigate } from '@tanstack/react-router'
import { CatalogSection } from '@/features/catalog/components/catalog-section'
import { Hero } from '@/features/catalog/components/hero'
import { catalogSearchSchema } from '@/features/catalog/search'
import { useIsDesktop } from '@/hooks/use-media-query'
import { type AuthMode, SocialLogin } from './auth-form'
import { type AuthReason, REASONS } from '../auth-copy'
import { AuthForm, AuthModalShell, AuthTabs, Divider } from './auth-modal-shell'

interface AuthScreenProps {
  mode: AuthMode
  redirect: string | undefined
  reason: AuthReason | undefined
}

/**
 * Login e cadastro: um modal sobre a tela inicial no desktop e uma página inteira no celular,
 * como no design. As duas formas são a mesma rota, então acesso direto e refresh funcionam.
 */
export function AuthScreen(props: AuthScreenProps) {
  const isDesktop = useIsDesktop()
  return isDesktop ? <AuthModal {...props} /> : <AuthPage {...props} />
}

const noop = () => undefined
const defaultSearch = catalogSearchSchema.parse({})

/** A tela inicial atrás do modal: só visual, sem foco nem leitura por tecnologias assistivas */
function HomeBackdrop() {
  return (
    <div inert aria-hidden className="pointer-events-none select-none">
      <Hero />
      <CatalogSection
        search={defaultSearch}
        onChange={noop}
        onPageChange={noop}
        onClearFilters={noop}
      />
    </div>
  )
}

function AuthModal({ mode, redirect, reason }: AuthScreenProps) {
  const navigate = useNavigate()
  const search = redirect ? { redirect } : {}

  return (
    <>
      <HomeBackdrop />
      <AuthModalShell
        mode={mode}
        redirect={redirect}
        reason={reason}
        onClose={() => void navigate({ to: '/' })}
        tabs={
          <AuthTabs mode={mode}>
            {({ id, label, className, current }) => (
              <Link
                to={id === 'login' ? '/login' : '/register'}
                search={search}
                aria-current={current ? 'page' : undefined}
                className={className}
              >
                {label}
              </Link>
            )}
          </AuthTabs>
        }
      />
    </>
  )
}

function AuthPage({ mode, redirect, reason }: AuthScreenProps) {
  const search = redirect ? { redirect } : {}
  return (
    <div className="page-container flex min-h-dvh flex-col pt-28 pb-10 text-center">
      <Link
        to="/"
        className="mx-auto text-3xl font-bold tracking-[0.2em]"
        aria-label="Kurio, página inicial"
      >
        KURIO
      </Link>
      <h1 className="mt-[4.5rem] text-lg font-bold">
        {mode === 'login' ? 'Entrar' : 'Criar perfil de colecionador'}
      </h1>
      {mode === 'login' && reason && (
        <p role="status" className="mt-4 border border-primary bg-band px-3 py-2 text-left text-sm">
          {REASONS[reason]}
        </p>
      )}

      <div className="mt-10 text-left">
        <AuthForm mode={mode} redirect={redirect} variant="page" />
      </div>
      <Divider className="mt-10" />
      <div className="mt-5 text-left">
        <SocialLogin variant="page" />
      </div>

      <p className="mt-12 text-sm text-muted-foreground">
        {mode === 'login' ? (
          <>
            Novo na Kurio?{' '}
            <Link
              to="/register"
              search={search}
              className="text-foreground underline underline-offset-2"
            >
              Crie uma conta
            </Link>
          </>
        ) : (
          <>
            Já tem uma conta?{' '}
            <Link
              to="/login"
              search={search}
              className="text-foreground underline underline-offset-2"
            >
              Entre
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
