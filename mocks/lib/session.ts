import { GUEST_CART_HEADER, guestCartIdSchema, type Session, type User } from '@/api/contracts'
import { db, type MockSession } from '../db'
import { activeScenario } from '../scenarios/runtime'
import type { MockUser } from '../fixtures'
import { guestCartKey } from './cart'
import { randomToken } from './crypto'
import { errorResponse } from './responses'

/** Duração padrão da sessão na simulação. Cenários podem encurtar. */
export const SESSION_TTL_MS = 60 * 60 * 1000

export function toPublicUser(user: MockUser): User {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  }
}

export function toSession(session: MockSession, user: MockUser): Session {
  return { token: session.token, expiresAt: session.expiresAt, user: toPublicUser(user) }
}

export function createSession(userId: string): MockSession {
  const now = Date.now()
  const session: MockSession = {
    token: randomToken(),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + (activeScenario().sessionTtlMs ?? SESSION_TTL_MS)).toISOString(),
  }
  db.update((draft) => {
    draft.sessions.push(session)
  })
  return session
}

export function getBearerToken(request: Request) {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

/**
 * Exige uma sessão válida. Lança 401 quando o token não existe, é desconhecido
 * ou expirou (com `details.reason` para a interface diferenciar os casos).
 */
export function requireSession(request: Request) {
  const token = getBearerToken(request)
  if (!token) throw errorResponse('unauthorized', 'Faça login para continuar')

  const session = db.state.sessions.find((s) => s.token === token)
  const user = session && db.state.users.find((u) => u.id === session.userId)
  if (!session || !user) {
    throw errorResponse('unauthorized', 'Sessão inválida. Faça login novamente.', {
      details: { reason: 'session_invalid' },
    })
  }

  if (Date.parse(session.expiresAt) <= Date.now()) {
    throw errorResponse('unauthorized', 'Sua sessão expirou. Faça login novamente.', {
      details: { reason: 'session_expired' },
    })
  }

  return { session, user }
}

/**
 * Dono do carrinho: o usuário da sessão ou, sem token, o visitante identificado
 * pelo cabeçalho `X-Guest-Cart-Id`. Um token inválido continua sendo 401.
 */
export function requireCartOwner(request: Request) {
  if (getBearerToken(request)) return requireSession(request).user.id
  const guest = guestCartIdSchema.safeParse(request.headers.get(GUEST_CART_HEADER))
  if (!guest.success) throw errorResponse('unauthorized', 'Carrinho não identificado')
  return guestCartKey(guest.data)
}
