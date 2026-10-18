import { createFileRoute, Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { CartItem } from '@/api/contracts'
import { MobileBackButton } from '@/components/layout/mobile-back-button'
import { NftCarousel } from '@/features/catalog/components/nft-carousel'
import { CartNotices } from '@/features/cart/components/cart-notices'
import { isUnavailable } from '@/features/cart/availability'
import { CartCards, CartItemsSkeleton, CartTable } from '@/features/cart/components/cart-items'
import { OrderSummary, SummarySheetSkeleton } from '@/features/cart/components/order-summary'
import { useCartSummary } from '@/features/cart/use-cart-summary'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useIsDesktop } from '@/hooks/use-media-query'
import { useCart } from '@/queries/cart'
import { QueryError } from '@/components/query-error'
import { StatePanel, stateActionClass } from '@/components/state-panel'
import { ShoppingCart } from 'lucide-react'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

/** Estrutura compartilhada entre o carregamento e o conteúdo final: o layout não se desloca */
const layoutClass =
  'mt-4 flex min-h-[calc(100dvh-5.5rem)] flex-col gap-8 md:min-h-0 lg:grid lg:grid-cols-[minmax(0,1fr)_20.75rem] lg:gap-14'
/** Folha do resumo no mobile: ancorada no fim da tela e, em telas baixas, no fluxo normal */
const sheetClass =
  'border-divider sticky bottom-0 z-30 -mx-4 mt-auto rounded-t-[2.5rem] border-t bg-card px-6 pt-5 pb-6 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] [@media(max-height:44rem)]:static'

function CartPage() {
  useDocumentTitle('Carrinho de NFTs')
  const isDesktop = useIsDesktop()
  const cart = useCart()
  const { items } = cart
  const summary = useCartSummary(cart.owner, items.length > 0)

  const variables = cart.mutation.variables
  const pendingItemId =
    cart.mutation.isPending && variables && 'itemId' in variables ? variables.itemId : null
  const blocked = items.some(isUnavailable)

  function changeQuantity(item: CartItem, quantity: number) {
    cart.update(item.id, quantity).catch((error: Error) => toast.error(error.message))
  }
  function removeItem(item: CartItem) {
    cart.remove(item.id).then(
      () => toast.success(`${item.name} foi removido do carrinho`),
      (error: Error) => toast.error(error.message),
    )
  }
  const actions = { pendingItemId, onQuantity: changeQuantity, onRemove: removeItem }

  const summaryProps = {
    quote: summary.quote,
    couponCode: summary.couponCode,
    onApplyCoupon: summary.applyCoupon,
    onRemoveCoupon: summary.removeCoupon,
    blocked,
    refreshing: cart.mutation.isPending,
  }

  return (
    <div className="page-container pt-4 md:pt-4">
      {isDesktop ? (
        <nav aria-label="Trilha de navegação" className="text-base font-bold">
          <ol className="flex gap-2">
            <li>
              <Link to="/" className="hover:text-highlight">
                Início
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link to="/" hash="mercado" className="hover:text-highlight">
                Mercado
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page">Carrinho</li>
          </ol>
        </nav>
      ) : (
        <div className="relative flex items-center justify-center py-1">
          <MobileBackButton className="absolute left-0" />
          <h1 className="text-xl font-bold">Carrinho de NFTs</h1>
        </div>
      )}
      {isDesktop && <h1 className="sr-only">Carrinho de NFTs</h1>}

      <div className="mt-4 md:mt-2">
        <CartNotices items={items} />
      </div>

      {cart.query.isError && !cart.cart ? (
        <QueryError
          subject="o carrinho"
          message={cart.query.error.message}
          onRetry={() => void cart.query.refetch()}
          className="mt-8"
        />
      ) : cart.isPending ? (
        <div className={layoutClass}>
          <div className="min-w-0">
            <CartItemsSkeleton />
          </div>
          {isDesktop ? (
            <OrderSummary {...summaryProps} />
          ) : (
            <div className={sheetClass}>
              <SummarySheetSkeleton />
            </div>
          )}
        </div>
      ) : items.length === 0 ? (
        <StatePanel
          icon={ShoppingCart}
          title="Seu carrinho está vazio"
          description="Explore o mercado e adicione os NFTs que quiser colecionar."
          className="mt-12"
        >
          <Link to="/" hash="mercado" className={stateActionClass}>
            Explorar NFTs
          </Link>
        </StatePanel>
      ) : (
        <div className={layoutClass}>
          <div className="min-w-0">
            {isDesktop ? (
              <CartTable items={items} {...actions} />
            ) : (
              <CartCards items={items} {...actions} />
            )}
          </div>

          {isDesktop ? (
            <OrderSummary {...summaryProps} />
          ) : (
            <div className={sheetClass}>
              <OrderSummary {...summaryProps} variant="sheet" />
            </div>
          )}
        </div>
      )}

      <NftCarousel
        title="Colecionadores também viram"
        params={{ sort: 'popular' }}
        excludeIds={items.map((item) => item.nftId)}
      />
    </div>
  )
}
