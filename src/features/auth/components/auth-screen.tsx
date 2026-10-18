import { Link, useNavigate } from '@tanstack/react-router'
import { CatalogSection } from '@/features/catalog/components/catalog-section'
import { Hero } from '@/features/catalog/components/hero'
import { catalogSearchSchema } from '@/features/catalog/search'
import { useIsDesktop } from '@/hooks/use-media-query'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { type AuthMode, LoginForm, RegisterForm, SocialLogin, type Variant } from './auth-form'

interface AuthScreenProps {
  mode: AuthMode
  redirect: string | undefined
  reason: 'session_expired' | 'session_invalid' | undefined
}

const COPY = {
  login: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  register: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
}

const REASONS = {
  session_expired: 'Sua sessão expirou. Entre novamente para continuar de onde parou.',
  session_invalid: 'Sua sessão não é mais válida. Entre novamente para continuar.',
}

/**
 * Login e cadastro: um modal sobre a tela inicial no desktop e uma página inteira no celular,
 * como no design. As duas formas são a mesma rota, então acesso direto e refresh funcionam.
 */
export function AuthScreen(props: AuthScreenProps) {
  const isDesktop = useIsDesktop()
  return isDesktop ? <AuthModal {...props} /> : <AuthPage {...props} />
}

function Form({
  mode,
  redirect,
  variant,
}: {
  mode: AuthMode
  redirect: string | undefined
  variant: Variant
}) {
  // A `key` reinicia os campos ao alternar entre entrar e criar conta
  return mode === 'login' ? (
    <LoginForm key="login" redirect={redirect} variant={variant} />
  ) : (
    <RegisterForm key="register" redirect={redirect} variant={variant} />
  )
}

function Divider({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <hr className="border-divider" />
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs max-md:bg-background">
        Ou continue com
      </span>
    </div>
  )
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
      <Dialog open onOpenChange={(open) => !open && void navigate({ to: '/' })}>
        <DialogContent className="max-h-[92dvh] w-full max-w-[31.25rem] gap-0 overflow-y-auto rounded-none border-0 bg-card p-0 sm:max-w-[31.25rem] [&>button]:top-5 [&>button]:right-5 [&>button]:text-primary [&>button]:opacity-100">
          <DialogTitle className="sr-only">
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </DialogTitle>
          <nav
            aria-label="Entrar ou criar conta"
            className="flex items-center justify-center gap-3 px-6 pt-12 text-xl font-bold"
          >
            <Link
              to="/login"
              search={search}
              aria-current={mode === 'login' ? 'page' : undefined}
              className={cn(mode === 'login' && 'text-highlight')}
            >
              Entrar
            </Link>
            <span aria-hidden className="h-5 w-px bg-primary" />
            <Link
              to="/register"
              search={search}
              aria-current={mode === 'register' ? 'page' : undefined}
              className={cn(mode === 'register' && 'text-highlight')}
            >
              Criar conta
            </Link>
          </nav>

          <div className="px-6 pt-8 sm:px-20">
            <DialogDescription className="text-center text-xs leading-relaxed text-foreground">
              {COPY[mode]}
            </DialogDescription>
            {mode === 'login' && reason && (
              <p role="status" className="mt-4 border border-primary bg-band px-3 py-2 text-sm">
                {REASONS[reason]}
              </p>
            )}
            <div className="mt-6">
              <Form mode={mode} redirect={redirect} variant="modal" />
            </div>
          </div>

          <Divider className="mt-6" />
          <div className="px-6 pt-5 pb-16 sm:px-20">
            <SocialLogin variant="modal" />
          </div>
          <div aria-hidden className="h-2.5 shrink-0 bg-primary" />
        </DialogContent>
      </Dialog>
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
        <Form mode={mode} redirect={redirect} variant="page" />
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
