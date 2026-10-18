/**
 * Guarda o token da sessão e avisa a aplicação quando ele muda ou expira.
 * Só o token fica no navegador: os dados do usuário vêm sempre da API.
 */

const STORAGE_KEY = 'nft-marketplace:session-token'

export type SessionEndReason = 'session_expired' | 'session_invalid'

export type SessionTokenEvent =
  { type: 'changed'; token: string | null } | { type: 'ended'; reason: SessionEndReason }

type Listener = (event: SessionTokenEvent) => void

const listeners = new Set<Listener>()

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

let token: string | null = storage()?.getItem(STORAGE_KEY) ?? null
/** Motivo do último encerramento pela API, lido uma vez pela tela de login */
let lastEndReason: SessionEndReason | null = null

function emit(event: SessionTokenEvent) {
  listeners.forEach((listener) => listener(event))
}

export const sessionToken = {
  get: () => token,

  set(next: string | null) {
    if (next === token) return
    token = next
    if (next) lastEndReason = null
    try {
      if (next) storage()?.setItem(STORAGE_KEY, next)
      else storage()?.removeItem(STORAGE_KEY)
    } catch {
      // Sem armazenamento: a sessão vale só nesta aba
    }
    emit({ type: 'changed', token: next })
  },

  /** A API recusou a sessão (expirada ou inválida): descarta o token e avisa */
  end(reason: SessionEndReason) {
    if (!token) return
    lastEndReason = reason
    sessionToken.set(null)
    emit({ type: 'ended', reason })
  },

  /** Retorna e esquece o motivo do último encerramento */
  takeEndReason() {
    const reason = lastEndReason
    lastEndReason = null
    return reason
  },

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

// Login, logout ou troca de usuário em outra aba
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || event.newValue === token) return
    token = event.newValue
    emit({ type: 'changed', token })
  })
}
