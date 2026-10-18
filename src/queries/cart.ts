import {
  mutationOptions,
  type QueryClient,
  type QueryKey,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import * as cartApi from '@/api/cart'
import type { AddCartItemRequest, Cart } from '@/api/contracts'
import { guestCartId } from '@/api/guest-cart-id'
import { checkoutStore } from '@/features/checkout/store'
import { queryKeys } from './keys'
import { useSession } from './session'

/** Dono do carrinho: o usuário autenticado ou o visitante (se já tiver carrinho) */
export type CartOwner = { type: 'user'; userId: string } | { type: 'guest'; guestCartId: string }

/**
 * Identificador do dono para chaves de cache e do estado do pagamento. O prefixo
 * `guest:` separa o visitante dos ids de usuário, e tudo sai do cache no logout.
 */
export function cartOwnerKey(owner: CartOwner) {
  return owner.type === 'user' ? owner.userId : `guest:${owner.guestCartId}`
}

export function cartQueryKey(owner: CartOwner): QueryKey {
  return owner.type === 'user'
    ? queryKeys.user.cart(owner.userId)
    : queryKeys.guestCart(owner.guestCartId)
}

export const cartQueryOptions = (owner: CartOwner) =>
  queryOptions({
    queryKey: cartQueryKey(owner),
    queryFn: ({ signal }) => cartApi.getCart(signal),
  })

const CART_MUTATION_KEY = ['cart', 'change'] as const

type CartChange =
  | { type: 'add'; item: AddCartItemRequest }
  | { type: 'update'; itemId: string; quantity: number }
  | { type: 'remove'; itemId: string }

function runChange(change: CartChange) {
  switch (change.type) {
    case 'add':
      // O visitante ganha um id de carrinho no primeiro item
      if (!guestCartId.get()) guestCartId.ensure()
      return cartApi.addCartItem(change.item)
    case 'update':
      return cartApi.updateCartItem(change.itemId, change.quantity)
    case 'remove':
      return cartApi.removeCartItem(change.itemId)
  }
}

/**
 * Alterações no carrinho. A API valida estoque e limite por pedido e devolve o
 * carrinho atualizado, que substitui o cache. As alterações saem em série: a
 * última resposta é sempre o estado mais recente do servidor.
 */
export const cartChangeMutationOptions = (queryClient: QueryClient, getOwner: () => CartOwner) =>
  mutationOptions<Cart, Error, CartChange>({
    mutationKey: CART_MUTATION_KEY,
    scope: { id: 'cart' },
    mutationFn: runChange,
    onSuccess: (cart) => {
      const owner = getOwner()
      queryClient.setQueryData(cartQueryKey(owner), cart)
      // O resumo de valores depende do carrinho: a cotação é refeita
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.quote(cartOwnerKey(owner)) })
    },
  })

function resolveOwner(userId: string | undefined, guestId: string | null): CartOwner | null {
  if (userId) return { type: 'user', userId }
  if (guestId) return { type: 'guest', guestCartId: guestId }
  return null
}

/** Carrinho atual e suas ações, para visitante ou usuário autenticado */
export function useCart() {
  const queryClient = useQueryClient()
  const { user, isPending: sessionPending } = useSession()
  const guestId = useSyncExternalStore(guestCartId.subscribe, guestCartId.get, () => null)
  const owner = sessionPending ? null : resolveOwner(user?.id, guestId)

  const query = useQuery({
    ...cartQueryOptions(owner ?? { type: 'guest', guestCartId: '' }),
    enabled: owner !== null,
  })

  const mutation = useMutation(
    cartChangeMutationOptions(
      queryClient,
      // Lido na hora da resposta: o primeiro item do visitante cria o id durante a mutation
      () => resolveOwner(user?.id, guestCartId.get()) ?? { type: 'guest', guestCartId: '' },
    ),
  )

  // Visitante sem carrinho ainda: carrinho vazio, sem chamar a API
  const cart = owner ? query.data : { items: [], updatedAt: new Date(0).toISOString() }
  return {
    owner,
    cart,
    items: cart?.items ?? [],
    /** Sessão ou carrinho ainda carregando: a tela mostra skeleton em vez do estado vazio */
    isPending: sessionPending || (owner !== null && query.isPending),
    query,
    mutation,
    add: (item: AddCartItemRequest) => mutation.mutateAsync({ type: 'add', item }),
    update: (itemId: string, quantity: number) =>
      mutation.mutateAsync({ type: 'update', itemId, quantity }),
    remove: (itemId: string) => mutation.mutateAsync({ type: 'remove', itemId }),
  }
}

/** O cupom aplicado no carrinho do visitante acompanha o carrinho para a conta */
function carryCouponToAccount(userId: string, guestId: string) {
  const guestKey = `guest:${guestId}`
  const guest = checkoutStore(guestKey)
  const coupon = guest.get().draft.couponCode
  const account = checkoutStore(userId)
  if (coupon && !account.get().draft.couponCode) {
    account.update((s) => ({ ...s, draft: { ...s.draft, couponCode: coupon } }))
  }
  guest.clear()
}

let mergeInFlight: Promise<void> | null = null

/**
 * Junta o carrinho do visitante ao da conta depois do login. Se falhar, o id do
 * visitante é mantido e a junção é tentada de novo na próxima vez.
 */
export function mergeGuestCartIntoAccount(queryClient: QueryClient, userId: string) {
  const guestId = guestCartId.get()
  if (!guestId) return Promise.resolve()

  mergeInFlight ??= cartApi
    .mergeGuestCart(guestId)
    .then((cart) => {
      queryClient.setQueryData(queryKeys.user.cart(userId), cart)
      guestCartId.clear()
      queryClient.removeQueries({ queryKey: queryKeys.guestCart(guestId) })
      carryCouponToAccount(userId, guestId)
    })
    .catch(() => undefined)
    .finally(() => {
      mergeInFlight = null
    })
  return mergeInFlight
}
