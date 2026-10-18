import { HttpResponse } from 'msw'
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  changePasswordRequestSchema,
  profileSchema,
  updateProfileRequestSchema,
} from '@/api/contracts'
import { db } from '../db'
import type { MockUser } from '../fixtures'
import { toAvatarDataUrl } from '../lib/avatar'
import { hashPassword, randomToken, verifyPassword } from '../lib/crypto'
import { api } from '../lib/http'
import { errorResponse, parseBody } from '../lib/responses'
import { requireSession } from '../lib/session'

/** Valida contra o contrato e remove hash e salt da senha */
const toProfile = (user: MockUser) => profileSchema.parse(user)

function updateUser(userId: string, changes: Partial<MockUser>) {
  db.update((draft) => {
    const user = draft.users.find((u) => u.id === userId)!
    Object.assign(user, changes, { updatedAt: new Date().toISOString() })
  })
  return db.state.users.find((u) => u.id === userId)!
}

export const profileHandlers = [
  api.get('/profile', ({ request }) => {
    const { user } = requireSession(request)
    return HttpResponse.json(toProfile(user))
  }),

  api.patch('/profile', async ({ request }) => {
    const { user } = requireSession(request)
    const body = await parseBody(request, updateProfileRequestSchema)
    const email = body.email.toLowerCase()
    const others = db.state.users.filter((u) => u.id !== user.id)

    const fields: Record<string, string> = {}
    if (others.some((u) => u.email === email)) fields.email = 'Este e-mail já está em uso'
    if (others.some((u) => u.username === body.username)) {
      fields.username = 'Este nome de usuário já está em uso'
    }
    if (Object.keys(fields).length > 0) {
      return errorResponse('conflict', 'Não foi possível salvar o perfil', { fields })
    }

    return HttpResponse.json(toProfile(updateUser(user.id, { ...body, email })))
  }),

  api.put('/profile/avatar', async ({ request }) => {
    const { user } = requireSession(request)
    const form = await request.formData().catch(() => null)
    const file = form?.get('file')

    if (!(file instanceof File)) {
      return errorResponse('validation_error', 'Envie uma imagem', {
        fields: { file: 'Selecione uma imagem' },
      })
    }
    if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
      return errorResponse('validation_error', 'Formato não suportado', {
        fields: { file: 'Use uma imagem PNG, JPEG ou WebP' },
      })
    }
    if (file.size > AVATAR_MAX_BYTES) {
      return errorResponse('validation_error', 'Imagem muito grande', {
        fields: { file: 'A imagem deve ter no máximo 2 MB' },
      })
    }

    const avatarUrl = await toAvatarDataUrl(file).catch(() => null)
    if (!avatarUrl) {
      return errorResponse('validation_error', 'Não foi possível ler a imagem', {
        fields: { file: 'O arquivo está corrompido ou não é uma imagem válida' },
      })
    }
    return HttpResponse.json(toProfile(updateUser(user.id, { avatarUrl })))
  }),

  api.delete('/profile/avatar', ({ request }) => {
    const { user } = requireSession(request)
    return HttpResponse.json(toProfile(updateUser(user.id, { avatarUrl: null })))
  }),

  api.put('/profile/password', async ({ request }) => {
    const { user, session } = requireSession(request)
    const body = await parseBody(request, changePasswordRequestSchema)

    if (!(await verifyPassword(body.currentPassword, user.passwordSalt, user.passwordHash))) {
      return errorResponse('validation_error', 'Senha atual incorreta', {
        fields: { currentPassword: 'Senha atual incorreta' },
      })
    }

    const passwordSalt = randomToken(8)
    const passwordHash = await hashPassword(body.newPassword, passwordSalt)
    updateUser(user.id, { passwordSalt, passwordHash })
    // Mantém a sessão atual e encerra as demais sessões do usuário
    db.update((draft) => {
      draft.sessions = draft.sessions.filter(
        (s) => s.userId !== user.id || s.token === session.token,
      )
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
