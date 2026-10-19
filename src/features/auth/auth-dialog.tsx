import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useSyncExternalStore } from 'react'
import { useIsDesktop } from '@/hooks/use-media-query'
import { AuthModalShell, AuthTabs } from './components/auth-modal-shell'
import { CLOSED, readAuthDialog, setAuthDialog, subscribeAuthDialog } from './use-auth-dialog'

/** O diálogo de login e cadastro sobre a tela atual. Fica uma vez na raiz da aplicação. */
export function AuthDialog() {
  const { open, mode, redirect } = useSyncExternalStore(
    subscribeAuthDialog,
    readAuthDialog,
    readAuthDialog,
  )
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isDesktop = useIsDesktop()

  // Navegar (inclusive com voltar/avançar) ou redimensionar para o celular fecha o diálogo
  useEffect(() => {
    setAuthDialog(CLOSED)
  }, [pathname, isDesktop])

  if (!open) return null
  return (
    <AuthModalShell
      mode={mode}
      redirect={redirect}
      onClose={() => setAuthDialog(CLOSED)}
      onSuccess={async () => {
        setAuthDialog(CLOSED)
        if (redirect) await navigate({ href: redirect })
      }}
      tabs={
        <AuthTabs mode={mode}>
          {({ id, label, className, current }) => (
            <button
              type="button"
              aria-current={current ? 'page' : undefined}
              className={className}
              onClick={() => setAuthDialog({ open: true, mode: id, redirect })}
            >
              {label}
            </button>
          )}
        </AuthTabs>
      }
    />
  )
}
