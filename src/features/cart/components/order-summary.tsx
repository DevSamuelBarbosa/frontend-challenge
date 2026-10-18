import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { Quote } from '@/api/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { CouponForm } from './coupon-form'
import { PriceBreakdown } from './price-breakdown'

interface OrderSummaryProps {
  quote: UseQueryResult<Quote>
  couponCode: string | null
  onApplyCoupon: (code: string) => void
  onRemoveCoupon: () => void
  /** Itens esgotados ou acima do estoque: a compra não pode seguir até ajustar */
  blocked: boolean
  /** O carrinho está sendo alterado: os valores mostrados ainda são os anteriores */
  refreshing?: boolean
  className?: string
  /** `sheet`: resumo na folha inferior do mobile */
  variant?: 'panel' | 'sheet'
}

/** Resumo de valores do carrinho, sempre vindo da cotação da API */
export function OrderSummary({
  quote,
  couponCode,
  onApplyCoupon,
  onRemoveCoupon,
  blocked,
  refreshing = false,
  className,
  variant = 'panel',
}: OrderSummaryProps) {
  const data = quote.data
  const coupon = data?.coupon ?? null
  const couponError = data?.couponError ?? null
  const updating = (quote.isFetching && !quote.isPending) || refreshing

  return (
    <section aria-labelledby={`summary-${variant}`} className={className}>
      <h2
        id={`summary-${variant}`}
        className={cn(
          'border-divider border-b pb-2 text-lg font-bold',
          variant === 'sheet' && 'sr-only',
        )}
      >
        Resumo da carteira
      </h2>

      <CouponForm
        couponCode={couponCode}
        applied={coupon}
        error={couponError?.message ?? null}
        pending={Boolean(couponCode) && quote.isFetching && !coupon && !couponError}
        onApply={onApplyCoupon}
        onRemove={onRemoveCoupon}
        sheet={variant === 'sheet'}
      />

      {quote.isPending ? (
        <SummarySkeleton />
      ) : quote.isError && !data ? (
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
      ) : data ? (
        <PriceBreakdown quote={data} updating={updating} />
      ) : null}

      <div className="mt-5 flex flex-col items-stretch gap-3">
        {blocked ? (
          <>
            <button type="button" disabled className={cn(ctaClass(variant), 'opacity-50')}>
              Conectar e finalizar
            </button>
            <p role="alert" className="text-center text-xs text-required">
              Ajuste os itens indisponíveis para continuar.
            </p>
          </>
        ) : (
          <Link to="/checkout" className={ctaClass(variant)}>
            Conectar e finalizar
          </Link>
        )}
        <Link
          to="/"
          hash="mercado"
          className="text-center text-base text-highlight hover:underline hover:underline-offset-4"
        >
          Continuar explorando
        </Link>
      </div>
    </section>
  )
}

/** Botão principal: retangular no painel do desktop e em pílula com degradê na folha do mobile */
const ctaClass = (variant: 'panel' | 'sheet') =>
  cn(
    'grid place-items-center text-base font-bold text-primary-foreground transition-colors',
    variant === 'sheet'
      ? 'h-14 rounded-full bg-gradient-to-br from-primary to-[#a8683a]'
      : 'h-10 rounded-md bg-primary hover:bg-primary/90',
  )

/** Folha do resumo no mobile enquanto carrega: mesma altura da folha final, para o layout não se deslocar */
export function SummarySheetSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando resumo" className="flex flex-col gap-3">
      <Skeleton className="h-10 w-full rounded-full" />
      <Skeleton className="mt-2 h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="mt-3 h-7 w-full" />
      <Skeleton className="mt-3 h-14 w-full rounded-full" />
      <Skeleton className="h-6 w-1/2 self-center" />
    </div>
  )
}

function SummarySkeleton() {
  return (
    <div aria-busy="true" aria-label="Calculando valores" className="mt-4 flex flex-col gap-3">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="mt-3 h-7 w-full" />
    </div>
  )
}
