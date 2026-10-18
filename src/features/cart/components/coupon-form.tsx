import { Tag, X } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import type { Quote } from '@/api/contracts'
import { cn } from '@/lib/utils'

export interface CouponFormProps {
  couponCode: string | null
  applied: Quote['coupon']
  error: string | null
  pending: boolean
  onApply: (code: string) => void
  onRemove: () => void
  sheet: boolean
}

export function CouponForm({
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
