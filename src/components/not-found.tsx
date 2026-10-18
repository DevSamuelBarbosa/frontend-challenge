import { Link } from '@tanstack/react-router'
import { StatePanel, stateActionClass, stateLinkClass } from '@/components/state-panel'

interface NotFoundProps {
  title?: string
  description?: string
}

export function NotFound({
  title = 'Página não encontrada',
  description = 'O endereço acessado não existe ou foi removido.',
}: NotFoundProps) {
  return (
    <StatePanel code="404" title={title} description={description} as="h1" size="page">
      <Link to="/" className={stateActionClass}>
        Voltar para o início
      </Link>
      <Link to="/" hash="mercado" className={stateLinkClass}>
        Explorar o mercado
      </Link>
    </StatePanel>
  )
}
