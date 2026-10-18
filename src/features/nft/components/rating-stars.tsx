import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Estrelas de avaliação. As estrelas inteiras ficam preenchidas, como no design. */
export function RatingStars({ rating, className }: { rating: number; className?: string }) {
  const full = Math.floor(rating)
  return (
    <span
      role="img"
      aria-label={`Nota ${rating.toFixed(1).replace('.', ',')} de 5`}
      className={cn('inline-flex gap-0.5', className)}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            'size-4',
            i < full ? 'fill-primary text-primary' : 'fill-muted-foreground text-muted-foreground',
          )}
        />
      ))}
    </span>
  )
}
