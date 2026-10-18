import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <section className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <p>O endereço acessado não existe ou foi removido.</p>
      <Button asChild>
        <Link to="/">Voltar para o início</Link>
      </Button>
    </section>
  )
}
