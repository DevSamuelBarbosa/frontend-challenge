import { createFileRoute, Link } from '@tanstack/react-router'
import { MobileBackButton } from '@/components/layout/mobile-back-button'
import { CheckoutSummary } from '@/features/checkout/components/checkout-summary'
import { CollectorForm } from '@/features/checkout/components/collector-form'
import { ReviewDialog } from '@/features/checkout/components/review-dialog'
import { NetworkPicker, WalletPicker } from '@/features/checkout/components/wallet-picker'
import { type Checkout, useCheckout } from '@/features/checkout/use-checkout'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useIsDesktop } from '@/hooks/use-media-query'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCart } from '@/queries/cart'
import { StatePanel, stateActionClass } from '@/components/state-panel'
import { ShoppingCart } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  useDocumentTitle('Pagamento')
  const { session } = Route.useRouteContext()
  const checkout = useCheckout(session.user.id)
  const cart = useCart()
  const isDesktop = useIsDesktop()
  const emptyCart = !cart.isPending && cart.items.length === 0 && !checkout.review.open

  if (emptyCart) {
    return (
      <StatePanel
        icon={ShoppingCart}
        title="Seu carrinho está vazio"
        description="Adicione NFTs ao carrinho para seguir para o pagamento."
        as="h1"
        size="page"
      >
        <Link to="/" hash="mercado" className={stateActionClass}>
          Explorar NFTs
        </Link>
      </StatePanel>
    )
  }

  return (
    <div className="page-container pt-4">
      {isDesktop ? (
        <>
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
              <li aria-current="page">Pagamento</li>
            </ol>
          </nav>
          <h1 className="sr-only">Pagamento</h1>
        </>
      ) : (
        <div className="relative flex items-center justify-center py-1">
          <MobileBackButton className="absolute left-0" />
          <h1 className="text-xl font-bold">Pagamento com carteira</h1>
        </div>
      )}

      <form
        onSubmit={checkout.submit}
        noValidate
        aria-label="Dados do pedido"
        className={cn('mt-6', !isDesktop && 'pb-44')}
      >
        {isDesktop ? <DesktopLayout checkout={checkout} /> : <MobileLayout checkout={checkout} />}
      </form>

      <ReviewDialog checkout={checkout} />
    </div>
  )
}

function SubmitError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-center text-sm text-required">
      {message}
    </p>
  ) : null
}

function ConfirmButton({ checkout, className }: { checkout: Checkout; className?: string }) {
  return (
    <button
      type="submit"
      disabled={checkout.locked || checkout.preparing}
      className={cn(
        'grid place-items-center font-bold text-primary-foreground transition-colors disabled:opacity-60',
        className,
      )}
    >
      {checkout.preparing ? 'Preparando pedido…' : 'Confirmar compra'}
    </button>
  )
}

function DesktopLayout({ checkout }: { checkout: Checkout }) {
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,25.5rem)] lg:gap-14">
      <CollectorForm checkout={checkout} />
      <div className="flex flex-col gap-8">
        <CheckoutSummary checkout={checkout} />
        <WalletPicker checkout={checkout} title="Carteira e rede" />
        <div className="flex flex-col gap-3">
          <ConfirmButton
            checkout={checkout}
            className="h-11 rounded-md bg-primary hover:bg-primary/90"
          />
          <SubmitError message={checkout.submitError} />
        </div>
      </div>
    </div>
  )
}

function MobileLayout({ checkout }: { checkout: Checkout }) {
  const total = checkout.quote.data?.totalEth
  return (
    <div className="flex flex-col gap-8">
      <WalletPicker checkout={checkout} title="Carteira" />
      <NetworkPicker checkout={checkout} />
      <CollectorForm checkout={checkout} />
      <CheckoutSummary checkout={checkout} />

      <div className="border-divider fixed inset-x-0 bottom-0 z-40 flex flex-col gap-3 rounded-t-[2.5rem] border-t bg-card px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
        <p className="flex items-baseline justify-end gap-4" aria-live="polite">
          <span className="font-bold">Total:</span>
          <span className="text-xl font-bold text-highlight">{total ? formatEth(total) : '—'}</span>
        </p>
        <ConfirmButton
          checkout={checkout}
          className="h-14 rounded-full bg-gradient-to-br from-primary to-[#a8683a]"
        />
        <SubmitError message={checkout.submitError} />
      </div>
    </div>
  )
}
