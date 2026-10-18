import { type FavoriteList, favoriteListSchema } from './contracts'
import { api } from './client'
import { parseResponse } from './parse'

export async function getFavorites(signal?: AbortSignal): Promise<FavoriteList> {
  const { data } = await api.get('/favorites', { signal })
  return parseResponse(favoriteListSchema, data)
}

export async function addFavorite(nftId: string): Promise<FavoriteList> {
  const { data } = await api.post('/favorites', { nftId })
  return parseResponse(favoriteListSchema, data)
}

export async function removeFavorite(nftId: string): Promise<FavoriteList> {
  const { data } = await api.delete(`/favorites/${encodeURIComponent(nftId)}`)
  return parseResponse(favoriteListSchema, data)
}
