import { HttpResponse } from 'msw'
import { addFavoriteRequestSchema, type FavoriteList } from '@/api/contracts'
import { db } from '../db'
import { toNftSummary } from '../lib/catalog'
import { api } from '../lib/http'
import { errorResponse, parseBody } from '../lib/responses'
import { requireSession } from '../lib/session'

function toFavoriteList(userId: string): FavoriteList {
  const nftIds = db.state.favorites[userId] ?? []
  const items = nftIds.flatMap((id) => {
    const nft = db.state.nfts.find((n) => n.id === id)
    return nft ? [toNftSummary(nft)] : []
  })
  return { nftIds, items }
}

function changeFavoritesCount(nftId: string, delta: number) {
  db.update((draft) => {
    const nft = draft.nfts.find((n) => n.id === nftId)
    if (nft) nft.favoritesCount = Math.max(0, nft.favoritesCount + delta)
  })
}

export const favoriteHandlers = [
  api.get('/favorites', ({ request }) => {
    const { user } = requireSession(request)
    return HttpResponse.json(toFavoriteList(user.id))
  }),

  // Inclusão e remoção são idempotentes: repetir a operação não muda o resultado
  api.post('/favorites', async ({ request }) => {
    const { user } = requireSession(request)
    const { nftId } = await parseBody(request, addFavoriteRequestSchema)
    if (!db.state.nfts.some((n) => n.id === nftId)) {
      return errorResponse('not_found', 'NFT não encontrado')
    }

    if (!db.state.favorites[user.id]?.includes(nftId)) {
      db.update((draft) => {
        draft.favorites[user.id] = [...(draft.favorites[user.id] ?? []), nftId]
      })
      changeFavoritesCount(nftId, 1)
    }
    return HttpResponse.json(toFavoriteList(user.id))
  }),

  api.delete('/favorites/:nftId', ({ request, params }) => {
    const { user } = requireSession(request)
    const nftId = String(params.nftId)

    if (db.state.favorites[user.id]?.includes(nftId)) {
      db.update((draft) => {
        draft.favorites[user.id] = draft.favorites[user.id].filter((id) => id !== nftId)
      })
      changeFavoritesCount(nftId, -1)
    }
    return HttpResponse.json(toFavoriteList(user.id))
  }),
]
