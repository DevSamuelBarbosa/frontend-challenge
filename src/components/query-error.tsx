import { TriangleAlert } from 'lucide-react'
import { StatePanel, stateActionClass } from '@/components/state-panel'

interface QueryErrorProps {
  /** O que não carregou, ex.: "o carrinho" */
  subject: string
  message?: string
  onRetry: () => void
  size?: 'page' | 'inline'
  className?: string
}

/** Falha ao carregar dados de uma seção, com a mensagem da API e a nova tentativa */
export function QueryError({
  subject,
  message,
  onRetry,
  size = 'inline',
  className,
}: QueryErrorProps) {
  return (
    <StatePanel
      role="alert"
      icon={TriangleAlert}
      title={`Não foi possível carregar ${subject}.`}
      description={message}
      size={size}
      className={className}
    >
      <button type="button" onClick={onRetry} className={stateActionClass}>
        Tentar novamente
      </button>
    </StatePanel>
  )
}
