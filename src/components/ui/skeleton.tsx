import { cn } from 'cn'

/** Placeholder com efeito shimmer (parado quando o usuário prefere menos movimento) */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('skeleton-shimmer rounded-md bg-card', className)}
      {...props}
    />
  )
}

export { Skeleton }
