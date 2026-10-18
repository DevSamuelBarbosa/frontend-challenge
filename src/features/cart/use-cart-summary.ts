import { useQuery } from '@tanstack/react-query'
import { useCallback, useSyncExternalStore } from 'react'
import { checkoutStore } from '@/features/checkout/store'
import { type CartOwner, cartOwnerKey } from '@/queries/cart'
import { quoteQueryOptions } from '@/queries/quote'

/**
 * Resumo de valores do carrinho: a cotação da API (subtotal, desconto, taxa de rede
 * e total) para o cupom e a rede escolhidos. O cupom fica no mesmo estado do
 * pagamento, então o que o usuário aplica aqui segue para o checkout.
 */
export function useCartSummary(owner: CartOwner | null, hasItems: boolean) {
  const key = owner ? cartOwnerKey(owner) : ''
  const store = checkoutStore(key)
  const { draft } = useSyncExternalStore(store.subscribe, store.get)
  const couponCode = draft.couponCode

  const quote = useQuery({
    ...quoteQueryOptions(key, { network: draft.network, couponCode: couponCode ?? undefined }),
    enabled: owner !== null && hasItems,
  })

  const applyCoupon = useCallback(
    (code: string) => {
      const normalized = code.trim().toUpperCase()
      store.update((s) => ({ ...s, draft: { ...s.draft, couponCode: normalized || null } }))
    },
    [store],
  )
  const removeCoupon = useCallback(() => applyCoupon(''), [applyCoupon])

  return { quote, couponCode, network: draft.network, applyCoupon, removeCoupon }
}
