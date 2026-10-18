import {
  mutationOptions,
  type QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { toast } from 'sonner'
import type { FavoriteList, Nft, NftSummary } from '@/api/contracts'
import { addFavorite, getFavorites, removeFavorite } from '@/api/favorites'
import { queryKeys } from './keys'
import { useSession } from './session'

const FAVORITES_MUTATION_KEY = ['favorites', 'toggle'] as const

export const favoritesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.user.favorites(userId),
    queryFn: ({ signal }) => getFavorites(signal),
  })

interface ToggleFavoriteVariables {
  nftId: string
  favorite: boolean
}

interface ToggleFavoriteContext {
  /** Item removido da lista, para devolvê-lo no rollback */
  removedItem: NftSummary | undefined
}

function setFavorite(list: FavoriteList | undefined, nftId: string, favorite: boolean) {
  const current = list ?? { nftIds: [], items: [] }
  const nftIds = current.nftIds.filter((id) => id !== nftId)
  return {
    nftIds: favorite ? [...nftIds, nftId] : nftIds,
    items: favorite ? current.items : current.items.filter((item) => item.id !== nftId),
  }
}

function shiftFavoritesCount(nft: Nft | undefined, delta: number) {
  return nft && { ...nft, favoritesCount: Math.max(0, nft.favoritesCount + delta) }
}

/**
 * Favoritar com atualização otimista: a interface muda na hora e, se a API
 * falhar, só a alteração que falhou é desfeita. Restaurar um snapshot inteiro
 * apagaria outras alterações otimistas feitas em seguida.
 */
export const toggleFavoriteMutationOptions = (queryClient: QueryClient, userId: string) =>
  mutationOptions<FavoriteList, Error, ToggleFavoriteVariables, ToggleFavoriteContext>({
    mutationKey: FAVORITES_MUTATION_KEY,
    // Requisições em série, na ordem dos cliques: "favoritar" e "desfavoritar" rápidos
    // não chegam invertidos ao servidor. O valor otimista é aplicado na hora mesmo assim.
    scope: { id: 'favorites' },
    mutationFn: ({ nftId, favorite }) => (favorite ? addFavorite(nftId) : removeFavorite(nftId)),

    onMutate: async ({ nftId, favorite }) => {
      const favoritesKey = queryKeys.user.favorites(userId)
      const nftKey = queryKeys.nfts.detail(nftId)
      // Uma consulta em andamento não pode sobrescrever o valor otimista
      await Promise.all([
        queryClient.cancelQueries({ queryKey: favoritesKey }),
        queryClient.cancelQueries({ queryKey: nftKey }),
      ])

      const removedItem = favorite
        ? undefined
        : queryClient.getQueryData<FavoriteList>(favoritesKey)?.items.find((i) => i.id === nftId)
      queryClient.setQueryData<FavoriteList>(favoritesKey, (list) =>
        setFavorite(list, nftId, favorite),
      )
      queryClient.setQueryData<Nft>(nftKey, (nft) => shiftFavoritesCount(nft, favorite ? 1 : -1))
      return { removedItem }
    },

    onError: (_error, { nftId, favorite }, context) => {
      queryClient.setQueryData<FavoriteList>(queryKeys.user.favorites(userId), (list) => {
        const reverted = setFavorite(list, nftId, !favorite)
        const item = context?.removedItem
        return item ? { ...reverted, items: [...reverted.items, item] } : reverted
      })
      queryClient.setQueryData<Nft>(queryKeys.nfts.detail(nftId), (nft) =>
        shiftFavoritesCount(nft, favorite ? -1 : 1),
      )
    },

    onSettled: (_data, _error, { nftId }) => {
      // Só revalida quando a última alteração terminar, para não piscar valores intermediários
      if (queryClient.isMutating({ mutationKey: FAVORITES_MUTATION_KEY }) > 1) return
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.favorites(userId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.detail(nftId) })
    },
  })

/**
 * Estado e ação de favoritos para a interface. Visitantes são levados ao login
 * e voltam para a mesma página depois.
 */
export function useFavorites() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useSession()
  const userId = user?.id ?? ''

  const favorites = useQuery({ ...favoritesQueryOptions(userId), enabled: Boolean(user) })
  const mutation = useMutation(toggleFavoriteMutationOptions(queryClient, userId))
  const { mutate } = mutation

  const isFavorite = useCallback(
    (nftId: string) => favorites.data?.nftIds.includes(nftId) ?? false,
    [favorites.data],
  )

  const toggle = useCallback(
    (nftId: string) => {
      if (!user) {
        void navigate({ to: '/login', search: { redirect: location.href } })
        return
      }
      const favorite = !isFavorite(nftId)
      mutate(
        { nftId, favorite },
        {
          onError: () =>
            toast.error(
              favorite
                ? 'Não foi possível favoritar. Tente novamente.'
                : 'Não foi possível remover dos favoritos. Tente novamente.',
            ),
        },
      )
    },
    [user, navigate, location.href, mutate, isFavorite],
  )

  return { favorites, isFavorite, toggle, mutation }
}
