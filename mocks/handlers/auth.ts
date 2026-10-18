import { HttpResponse } from 'msw'
import { loginRequestSchema, registerRequestSchema } from '@/api/contracts'
import { db } from '../db'
import type { MockUser } from '../fixtures'
import { hashPassword, randomToken, verifyPassword } from '../lib/crypto'
import { api } from '../lib/http'
import { errorResponse, parseBody } from '../lib/responses'
import { createSession, getBearerToken, requireSession, toSession } from '../lib/session'

export const authHandlers = [
  api.post('/auth/register', async ({ request }) => {
    const body = await parseBody(request, registerRequestSchema)
    const email = body.email.toLowerCase()

    const fields: Record<string, string> = {}
    if (db.state.users.some((u) => u.email === email)) {
      fields.email = 'Já existe uma conta com este e-mail'
    }
    if (db.state.users.some((u) => u.username === body.username)) {
      fields.username = 'Este nome de usuário já está em uso'
    }
    if (Object.keys(fields).length > 0) {
      return errorResponse('conflict', 'Não foi possível criar a conta', { fields })
    }

    const now = new Date().toISOString()
    const salt = randomToken(8)
    const user: MockUser = {
      id: db.nextId('user'),
      name: body.name,
      username: body.username,
      email,
      bio: '',
      ensName: '',
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
      passwordSalt: salt,
      passwordHash: await hashPassword(body.password, salt),
    }
    db.update((draft) => {
      draft.users.push(user)
      draft.carts[user.id] = []
      draft.favorites[user.id] = []
    })

    return HttpResponse.json(toSession(createSession(user.id), user), { status: 201 })
  }),

  api.post('/auth/login', async ({ request }) => {
    const body = await parseBody(request, loginRequestSchema)
    const user = db.state.users.find((u) => u.email === body.email.toLowerCase())

    // Mensagem genérica para não revelar quais e-mails estão cadastrados
    if (!user || !(await verifyPassword(body.password, user.passwordSalt, user.passwordHash))) {
      return errorResponse('unauthorized', 'E-mail ou senha incorretos', {
        details: { reason: 'invalid_credentials' },
      })
    }

    return HttpResponse.json(toSession(createSession(user.id), user))
  }),

  api.get('/auth/session', ({ request }) => {
    const { session, user } = requireSession(request)
    return HttpResponse.json(toSession(session, user))
  }),

  api.post('/auth/logout', ({ request }) => {
    const token = getBearerToken(request)
    if (token) {
      db.update((draft) => {
        draft.sessions = draft.sessions.filter((s) => s.token !== token)
      })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
