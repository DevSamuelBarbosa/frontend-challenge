import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { type AuthReason, COPY, REASONS } from '../auth-copy'
import { type AuthMode, LoginForm, RegisterForm, SocialLogin, type Variant } from './auth-form'

export function AuthForm({
  mode,
  redirect,
  variant,
  onSuccess,
}: {
  mode: AuthMode
  redirect: string | undefined
  variant: Variant
  onSuccess?: () => void | Promise<void>
}) {
  // A `key` reinicia os campos ao alternar entre entrar e criar conta
  return mode === 'login' ? (
    <LoginForm key="login" redirect={redirect} variant={variant} onSuccess={onSuccess} />
  ) : (
    <RegisterForm key="register" redirect={redirect} variant={variant} onSuccess={onSuccess} />
  )
}

export function Divider({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <hr className="border-divider" />
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs max-md:bg-background">
        Ou continue com
      </span>
    </div>
  )
}

/** Abas "Entrar | Criar conta" do modal: cada uma é um link ou um botão, conforme o uso */
export function AuthTabs({
  mode,
  children,
}: {
  mode: AuthMode
  children: (tab: { id: AuthMode; label: string; className: string; current: boolean }) => ReactNode
}) {
  const tabs: { id: AuthMode; label: string }[] = [
    { id: 'login', label: 'Entrar' },
    { id: 'register', label: 'Criar conta' },
  ]
  return (
    <nav
      aria-label="Entrar ou criar conta"
      className="flex items-center justify-center gap-3 px-6 pt-12 text-xl font-bold"
    >
      {tabs.map((tab, index) => (
        <div key={tab.id} className="flex items-center gap-3">
          {index > 0 && <span aria-hidden className="h-5 w-px bg-primary" />}
          {children({
            ...tab,
            current: mode === tab.id,
            className: cn(mode === tab.id && 'text-highlight'),
          })}
        </div>
      ))}
    </nav>
  )
}

interface AuthModalShellProps {
  mode: AuthMode
  redirect: string | undefined
  reason?: AuthReason
  /** Abas de modo (links na rota, botões no diálogo sobre a tela) */
  tabs: ReactNode
  onClose: () => void
  onSuccess?: () => void | Promise<void>
}

/** O modal de login e cadastro do design (500 px, fundo de card, barra laranja na base) */
export function AuthModalShell({
  mode,
  redirect,
  reason,
  tabs,
  onClose,
  onSuccess,
}: AuthModalShellProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] w-full max-w-[31.25rem] gap-0 overflow-y-auto rounded-none border-0 bg-card p-0 sm:max-w-[31.25rem] [&>button]:top-5 [&>button]:right-5 [&>button]:text-primary [&>button]:opacity-100">
        <DialogTitle className="sr-only">{mode === 'login' ? 'Entrar' : 'Criar conta'}</DialogTitle>
        {tabs}

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
            <AuthForm mode={mode} redirect={redirect} variant="modal" onSuccess={onSuccess} />
          </div>
        </div>

        <Divider className="mt-6" />
        <div className="px-6 pt-5 pb-16 sm:px-20">
          <SocialLogin variant="modal" />
        </div>
        <div aria-hidden className="h-2.5 shrink-0 bg-primary" />
      </DialogContent>
    </Dialog>
  )
}
