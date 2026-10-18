import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Botão de ação principal dos estados (mesmo estilo dos botões do design) */
export const stateActionClass =
  'inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90'

/** Ação secundária: só o texto em destaque */
export const stateLinkClass =
  'text-sm font-bold text-highlight underline underline-offset-4 hover:no-underline'

interface StatePanelProps {
  /** Ícone ou código grande (ex.: "404") que identifica o estado */
  icon?: LucideIcon
  code?: string
  title: string
  description?: ReactNode
  /** Botões e links de saída do estado */
  children?: ReactNode
  /** `alert` para falhas, que leitores de tela anunciam na hora */
  role?: 'alert' | 'status'
  /** Nível do título: `h1` quando o estado ocupa a página toda */
  as?: 'h1' | 'h2'
  /** `page`: ocupa a página; `inline`: dentro de uma seção, num painel */
  size?: 'page' | 'inline'
  className?: string
}

/**
 * Estados de página (404, erro, vazio) no visual do site: painel centralizado com ícone ou
 * código, título, texto de apoio e as ações para sair do estado.
 */
export function StatePanel({
  icon: Icon,
  code,
  title,
  description,
  children,
  role,
  as: Heading = 'h2',
  size = 'inline',
  className,
}: StatePanelProps) {
  return (
    <section
      role={role}
      className={cn(
        'flex flex-col items-center gap-3 text-center',
        size === 'page' ? 'page-container py-20 md:py-28' : 'bg-card px-6 py-10',
        className,
      )}
    >
      {code && (
        <p aria-hidden className="text-6xl leading-none font-bold text-highlight md:text-7xl">
          {code}
        </p>
      )}
      {Icon && (
        <span className="mb-1 grid size-14 place-items-center rounded-full bg-background text-primary">
          <Icon className="size-7" aria-hidden />
        </span>
      )}
      <Heading className={cn('font-bold', size === 'page' ? 'text-2xl' : 'text-lg')}>
        {code && <span className="sr-only">{code}: </span>}
        {title}
      </Heading>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {children && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {children}
        </div>
      )}
    </section>
  )
}
