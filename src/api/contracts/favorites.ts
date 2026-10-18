import { z } from 'zod'
import { idSchema } from './common'
import { nftSummarySchema } from './nfts'

/*
 * Requer autenticação.
 * GET    /favorites                           -> FavoriteList
 * POST   /favorites         AddFavoriteRequest -> FavoriteList
 * DELETE /favorites/:nftId                    -> FavoriteList
 */

export const favoriteListSchema = z.object({
  nftIds: z.array(idSchema),
  items: z.array(nftSummarySchema),
})
export type FavoriteList = z.infer<typeof favoriteListSchema>

export const addFavoriteRequestSchema = z.object({ nftId: idSchema })
export type AddFavoriteRequest = z.infer<typeof addFavoriteRequestSchema>
