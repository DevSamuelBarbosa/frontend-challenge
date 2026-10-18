import type { Quote } from '@/api/contracts'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Subtotal, desconto, taxa de rede e total, sempre vindos da cotação da API */
export function PriceBreakdown({
  quote,
  updating,
  className,
}: {
  quote: Quote
  /** Os valores mostrados ainda são os anteriores: a cotação está sendo refeita */
  updating?: boolean
  className?: string
}) {
  return (
    <dl
      aria-busy={updating}
      className={cn(
        'mt-4 flex flex-col gap-2 text-base transition-opacity',
        updating && 'opacity-60',
        className,
      )}
    >
      <Row label="Subtotal" value={formatEth(quote.subtotalEth)} />
      <Row
        label="Desconto do lançamento"
        value={`(-) ${formatEth(quote.discountEth, { unit: false })}`}
        muted={Number(quote.discountEth) === 0}
      />
      <Row label="Taxa de rede" value={formatEth(quote.networkFeeEth)} />
      <dd className="-mt-1 text-right text-xs text-highlight">Taxa estimada</dd>
      <Row label="Total" value={formatEth(quote.totalEth)} total />
    </dl>
  )
}

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
