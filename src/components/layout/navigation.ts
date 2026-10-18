import { useRouterState } from '@tanstack/react-router'
import { useCart } from '@/queries/cart'

/** Seções do menu principal. "Mercado" cobre o catálogo e o fluxo de compra. */
export type MainSection = 'home' | 'market' | null

const MARKET_PATHS = ['/nfts/', '/cart', '/checkout', '/orders/']

export function useMainSection(): MainSection {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  if (pathname === '/') return 'home'
  if (MARKET_PATHS.some((path) => pathname.startsWith(path))) return 'market'
  return null
}

/** O detalhe do NFT tem uma barra de compra fixa no mobile, que substitui a navegação inferior */
export function useHasBuyBar() {
  return useRouterState({ select: (s) => s.location.pathname.startsWith('/nfts/') })
}

/** Telas com a própria barra de ações no mobile, que substitui a navegação inferior */
export function useHidesMobileNav() {
  return useRouterState({
    select: (s) => s.location.pathname.startsWith('/nfts/') || s.location.pathname === '/cart',
  })
}

/** Quantidade total de unidades no carrinho, para o contador */
export function useCartCount() {
  const { items } = useCart()
  return items.reduce((total, item) => total + item.quantity, 0)
}

export function cartLabel(count: number) {
  if (count === 0) return 'Carrinho vazio'
  return `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`
}
