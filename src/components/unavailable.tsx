import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const UNAVAILABLE_HINT = 'Indisponível nesta demonstração'

/**
 * Item de navegação fora do escopo da entrega: aparece no layout, mas não é
 * clicável nem aparenta funcionar. Leitores de tela anunciam que está indisponível.
 */
export function UnavailableLink({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      role="link"
      aria-disabled="true"
      title={UNAVAILABLE_HINT}
      className={cn('cursor-not-allowed opacity-50', className)}
    >
      {children}
      <span className="sr-only"> ({UNAVAILABLE_HINT.toLowerCase()})</span>
    </span>
  )
}

/** Botão de ação fora do escopo (ex.: login social, newsletter) */
export function UnavailableButton({
  children,
  className,
  label,
}: {
  children: ReactNode
  className?: string
  /** Nome acessível, quando o conteúdo é só um ícone */
  label?: string
}) {
  return (
    <button
      type="button"
      disabled
      aria-label={label ? `${label} (${UNAVAILABLE_HINT.toLowerCase()})` : undefined}
      title={UNAVAILABLE_HINT}
      className={cn('cursor-not-allowed opacity-50', className)}
    >
      {children}
      {!label && <span className="sr-only"> ({UNAVAILABLE_HINT.toLowerCase()})</span>}
    </button>
  )
}
