import { useLocation, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { useIsDesktop } from '@/hooks/use-media-query'
import type { AuthMode } from './components/auth-form'

export interface DialogState {
  open: boolean
  mode: AuthMode
  /** Destino depois de entrar. Sem ele, a pessoa continua na tela em que estava. */
  redirect: string | undefined
}

export const CLOSED: DialogState = { open: false, mode: 'login', redirect: undefined }

let state: DialogState = CLOSED
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())
export const setAuthDialog = (next: DialogState) => {
  state = next
  emit()
}
export const subscribeAuthDialog = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export const readAuthDialog = () => state

interface OpenOptions {
  mode?: AuthMode
  /** Para onde ir depois de entrar (ex.: o pagamento). Sem ele, fica na tela atual. */
  redirect?: string
}

/**
 * Abre o login ou o cadastro. No desktop é um diálogo **sobre a tela atual**, sem navegar: o
 * que está na tela (itens do carrinho, o NFT aberto) continua exatamente como estava. No
 * celular o login é uma página (como no design), que volta para onde a pessoa estava.
 */
export function useAuthDialog() {
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useIsDesktop()
  const pathname = location.pathname

  return useCallback(
    ({ mode = 'login', redirect }: OpenOptions = {}) => {
      // Já está no login ou no cadastro
      if (pathname === '/login' || pathname === '/register') return
      if (isDesktop) {
        setAuthDialog({ open: true, mode, redirect })
        return
      }
      void navigate({
        to: mode === 'login' ? '/login' : '/register',
        search: { redirect: redirect ?? location.href },
      })
    },
    [isDesktop, navigate, pathname, location.href],
  )
}
