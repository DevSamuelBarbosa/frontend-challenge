import { HttpResponse } from 'msw'
import {
  connectWalletRequestSchema,
  createWalletRequestSchema,
  updateWalletRequestSchema,
  walletConnectionSchema,
  walletSchema,
} from '@/api/contracts'
import { db, type MockWalletConnection } from '../db'
import type { MockWallet } from '../fixtures'
import { api } from '../lib/http'
import { errorResponse, parseBody } from '../lib/responses'
import { requireSession } from '../lib/session'

const toWallet = (wallet: MockWallet) => walletSchema.parse(wallet)

const userWallets = (userId: string) => db.state.wallets.filter((w) => w.userId === userId)

/** O mesmo endereço não pode ser cadastrado duas vezes pelo usuário */
function addressConflict(userId: string, address: string, ignoreId?: string) {
  const taken = userWallets(userId).some(
    (w) => w.id !== ignoreId && w.address.toLowerCase() === address.toLowerCase(),
  )
  return taken
    ? errorResponse('conflict', 'Endereço já cadastrado', {
        fields: { address: 'Esta carteira já está cadastrada na sua conta' },
      })
    : null
}

export const walletHandlers = [
  api.get('/wallets', ({ request }) => {
    const { user } = requireSession(request)
    const wallets = userWallets(user.id)
      // Principal primeiro
      .sort((a, b) => a.role.localeCompare(b.role))
      .map(toWallet)
    return HttpResponse.json(wallets)
  }),

  api.post('/wallets', async ({ request }) => {
    const { user } = requireSession(request)
    const body = await parseBody(request, createWalletRequestSchema)

    if (userWallets(user.id).some((w) => w.role === body.role)) {
      const label = body.role === 'primary' ? 'principal' : 'secundária'
      return errorResponse('conflict', `Você já tem uma carteira ${label}`, {
        fields: { role: `Edite a carteira ${label} existente` },
      })
    }
    const conflict = addressConflict(user.id, body.address)
    if (conflict) return conflict

    const now = new Date().toISOString()
    const wallet: MockWallet = {
      id: db.nextId('wallet'),
      userId: user.id,
      ...body,
      createdAt: now,
      updatedAt: now,
    }
    db.update((draft) => {
      draft.wallets.push(wallet)
    })
    return HttpResponse.json(toWallet(wallet), { status: 201 })
  }),

  // Simula a carteira pedindo autorização ao usuário (o cenário `wallet-rejected` recusa)
  api.post('/wallets/:walletId/connection', async ({ request, params }) => {
    const { user } = requireSession(request)
    const { network } = await parseBody(request, connectWalletRequestSchema)
    const wallet = userWallets(user.id).find((w) => w.id === params.walletId)
    if (!wallet) return errorResponse('not_found', 'Carteira não encontrada')
    if (!wallet.networks.includes(network)) {
      return errorResponse('validation_error', 'A carteira não suporta a rede selecionada', {
        fields: { network: 'Esta carteira não está habilitada para a rede escolhida' },
      })
    }

    const connection: MockWalletConnection = {
      walletId: wallet.id,
      userId: user.id,
      network,
      connectedAt: new Date().toISOString(),
    }
    db.update((draft) => {
      // Uma conexão ativa por usuário: conectar outra carteira desconecta a anterior
      draft.walletConnections = draft.walletConnections.filter((c) => c.userId !== user.id)
      draft.walletConnections.push(connection)
    })
    return HttpResponse.json(walletConnectionSchema.parse(connection))
  }),

  api.delete('/wallets/:walletId/connection', ({ request, params }) => {
    const { user } = requireSession(request)
    db.update((draft) => {
      draft.walletConnections = draft.walletConnections.filter(
        (c) => !(c.userId === user.id && c.walletId === params.walletId),
      )
    })
    return new HttpResponse(null, { status: 204 })
  }),

  api.patch('/wallets/:walletId', async ({ request, params }) => {
    const { user } = requireSession(request)
    const body = await parseBody(request, updateWalletRequestSchema)
    const wallet = userWallets(user.id).find((w) => w.id === params.walletId)
    if (!wallet) return errorResponse('not_found', 'Carteira não encontrada')

    if (body.address) {
      const conflict = addressConflict(user.id, body.address, wallet.id)
      if (conflict) return conflict
    }

    db.update((draft) => {
      const target = draft.wallets.find((w) => w.id === wallet.id)!
      Object.assign(target, body, { updatedAt: new Date().toISOString() })
    })
    return HttpResponse.json(toWallet(db.state.wallets.find((w) => w.id === wallet.id)!))
  }),
]
