import { useState } from 'react'
import { NftImage } from '@/components/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { CouponForm } from '@/features/cart/components/coupon-form'
import { PriceBreakdown } from '@/features/cart/components/price-breakdown'
import { mulEth } from '@/lib/eth'
import { formatEth } from '@/lib/format'
import { useCart } from '@/queries/cart'
import type { Checkout } from '../use-checkout'

/** "Seus NFTs": itens do carrinho, cupom e valores da cotação */
export function CheckoutSummary({ checkout }: { checkout: Checkout }) {
  const { quote, couponCode } = checkout
  const cart = useCart()
  const [couponOpen, setCouponOpen] = useState(Boolean(couponCode))
  const data = quote.data
  const updating = quote.isFetching && !quote.isPending

  return (
    <section aria-labelledby="your-nfts-title">
      <h2 id="your-nfts-title" className="text-lg font-bold">
        Seus NFTs
      </h2>

      {cart.isPending ? (
        <div aria-busy="true" aria-label="Carregando itens" className="mt-3 flex flex-col gap-2">
          <Skeleton className="h-[4.375rem] w-full" />
          <Skeleton className="h-[4.375rem] w-full" />
        </div>
      ) : (
        <table className="mt-1 w-full border-separate border-spacing-y-2">
          <caption className="sr-only">Itens do pedido</caption>
          <thead>
            <tr className="[&>th]:border-divider [&>th]:border-b">
              <th scope="col" className="pb-2 text-left text-base font-bold">
                NFTs
              </th>
              <th scope="col" className="pb-2 text-right text-base font-bold">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {cart.items.map((item) => (
              <tr key={item.id} className="bg-card">
                <td className="w-full max-w-0 p-1.5">
                  <div className="flex items-center gap-3">
                    <NftImage
                      image={item.image}
                      sizes="60px"
                      decorative
                      className="size-[3.75rem] shrink-0 rounded-md"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-bold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">ID do token: {item.tokenId}</p>
                    </div>
                  </div>
                </td>
                <td className="pr-3 text-right">
                  <span className="block text-xs text-muted-foreground md:mr-2 md:inline md:text-sm">
                    (x {item.quantity})
                  </span>
                  <span className="text-lg font-bold whitespace-nowrap text-highlight">
                    {formatEth(mulEth(item.unitPriceEth, item.quantity))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-3">
        {couponOpen ? (
          <CouponForm
            couponCode={couponCode}
            applied={data?.coupon ?? null}
            error={data?.couponError?.message ?? null}
            pending={Boolean(couponCode) && quote.isFetching && !data?.coupon && !data?.couponError}
            onApply={checkout.applyCoupon}
            onRemove={checkout.removeCoupon}
            sheet={false}
          />
        ) : (
          <p className="text-center text-[0.9375rem]">
            Tem um código promocional?{' '}
            <button
              type="button"
              onClick={() => setCouponOpen(true)}
              className="text-highlight underline underline-offset-2"
            >
              Aplique aqui
            </button>
          </p>
        )}
      </div>

      {quote.isPending ? (
        <div aria-busy="true" aria-label="Calculando valores" className="mt-4 flex flex-col gap-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="mt-3 h-7 w-full" />
        </div>
      ) : data ? (
        <PriceBreakdown quote={data} updating={updating} />
      ) : (
        <div role="alert" className="mt-4 text-sm">
          <p>Não foi possível calcular os valores.</p>
          <button
            type="button"
            onClick={() => void quote.refetch()}
            className="mt-2 font-bold text-highlight underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </section>
  )
}
