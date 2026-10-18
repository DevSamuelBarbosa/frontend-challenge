import { Link, useRouter } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import { isApiError } from '@/api/errors'
import { StatePanel, stateActionClass, stateLinkClass } from '@/components/state-panel'

/**
 * Erro inesperado ao exibir uma tela (falha de renderização ou do carregamento da rota).
 * O resto do site continua funcionando: header, rodapé e navegação ficam no ar.
 */
export function RouteError({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter()
  return (
    <StatePanel
      role="alert"
      icon={TriangleAlert}
      title="Algo deu errado"
      description={
        isApiError(error)
          ? error.message
          : 'Não foi possível exibir esta página. Tente novamente em instantes.'
      }
      as="h1"
      size="page"
    >
      <button
        type="button"
        className={stateActionClass}
        onClick={() => {
          reset()
          void router.invalidate()
        }}
      >
        Tentar novamente
      </button>
      <Link to="/" className={stateLinkClass}>
        Voltar para o início
      </Link>
    </StatePanel>
  )
}
