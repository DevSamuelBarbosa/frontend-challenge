import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Tag, X } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import type { Quote } from '@/api/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'

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
        <dl
          aria-busy={updating}
          className={cn(
            'mt-4 flex flex-col gap-2 text-base transition-opacity',
            updating && 'opacity-60',
          )}
        >
          <Row label="Subtotal" value={formatEth(data.subtotalEth)} />
          <Row
            label="Desconto do lançamento"
            value={`(-) ${formatEth(data.discountEth, { unit: false })}`}
            muted={Number(data.discountEth) === 0}
          />
          <Row label="Taxa de rede" value={formatEth(data.networkFeeEth)} />
          <dd className="-mt-1 text-right text-xs text-highlight">Taxa estimada</dd>
          <Row label="Total" value={formatEth(data.totalEth)} total />
        </dl>
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

function Row({
  label,
  value,
  total,
  muted,
}: {
  label: string
  value: string
  total?: boolean
  muted?: boolean
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4', total && 'mt-3')}>
      <dt className={total ? 'font-bold' : undefined}>{label}</dt>
      <dd
        className={cn(
          'text-right',
          total && 'text-lg font-bold text-highlight',
          muted && 'text-muted-foreground',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

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

interface CouponFormProps {
  couponCode: string | null
  applied: Quote['coupon']
  error: string | null
  pending: boolean
  onApply: (code: string) => void
  onRemove: () => void
  sheet: boolean
}

function CouponForm({
  couponCode,
  applied,
  error,
  pending,
  onApply,
  onRemove,
  sheet,
}: CouponFormProps) {
  const inputId = useId()
  const errorId = useId()
  const [text, setText] = useState(couponCode ?? '')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (text.trim()) onApply(text)
  }

  if (applied) {
    return (
      <div className="mt-4">
        <div
          role="status"
          className="flex items-center justify-between gap-3 border border-primary bg-band px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            <Tag className="size-4 text-highlight" aria-hidden />
            <span>
              <strong>{applied.code}</strong> aplicado: {applied.description}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setText('')
              onRemove()
            }}
            aria-label={`Remover cupom ${applied.code}`}
            className="shrink-0 rounded-md p-0.5 hover:text-highlight"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-4" noValidate>
      <label htmlFor={inputId} className={cn('text-sm font-bold', sheet && 'sr-only')}>
        Código promocional
      </label>
      <div className={cn('flex', !sheet && 'mt-2')}>
        <input
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-10 min-w-0 flex-1 border bg-background px-3 text-sm placeholder:text-muted-foreground',
            sheet ? 'rounded-l-full border-input pl-4' : 'rounded-l-md border-primary',
            error && 'border-required',
          )}
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className={cn(
            'h-10 bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60',
            sheet ? 'rounded-r-full' : 'rounded-r-md',
          )}
        >
          {pending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-required">
          {error}
        </p>
      )}
    </form>
  )
}
