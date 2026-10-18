import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

interface NotFoundProps {
  title?: string
  description?: string
}

export function NotFound({
  title = 'Página não encontrada',
  description = 'O endereço acessado não existe ou foi removido.',
}: NotFoundProps) {
  return (
    <section className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p>{description}</p>
      <Button asChild>
        <Link to="/">Voltar para o início</Link>
      </Button>
    </section>
  )
}
