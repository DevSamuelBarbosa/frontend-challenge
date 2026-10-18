import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  className?: string
  /** Variante compacta da barra inferior do mobile e do carrinho */
  compact?: boolean
  /** Nome acessível do grupo, ex.: "Quantidade de Emerald Ape #042". Dá nome único aos botões. */
  label?: string
  /** Desabilita os dois botões, ex.: enquanto a alteração é salva */
  disabled?: boolean
}

/** Controle de quantidade inteira, limitado pelo estoque e pelo máximo por pedido */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  className,
  compact,
  label = 'Quantidade',
  disabled,
}: QuantityStepperProps) {
  const noun = label.charAt(0).toLowerCase() + label.slice(1)
  const button = cn(
    'grid place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-60',
    compact ? 'size-6' : 'size-8',
  )
  return (
    <div role="group" aria-label={label} className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Diminuir ${noun}`}
      >
        <Minus className={compact ? 'size-4' : 'size-5'} aria-hidden strokeWidth={3} />
      </button>
      <output
        aria-live="polite"
        className={cn('min-w-4 text-center', compact ? 'text-base' : 'text-lg')}
      >
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Aumentar ${noun}`}
      >
        <Plus className={compact ? 'size-4' : 'size-5'} aria-hidden strokeWidth={3} />
      </button>
    </div>
  )
}
