import type { AuthMode } from './components/auth-form'

export const COPY: Record<AuthMode, string> = {
  login: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  register: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
}

export type AuthReason = 'session_expired' | 'session_invalid'

export const REASONS: Record<AuthReason, string> = {
  session_expired: 'Sua sessão expirou. Entre novamente para continuar de onde parou.',
  session_invalid: 'Sua sessão não é mais válida. Entre novamente para continuar.',
}
