import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Botão de voltar do mobile: volta no histórico ou, sem histórico, para o início */
export function MobileBackButton({ className }: { className?: string }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: '/' }))}
      className={cn(
        'grid size-10 place-items-center rounded-full border border-input bg-card/80 text-highlight',
        className,
      )}
    >
      <ChevronLeft className="size-5" aria-hidden />
    </button>
  )
}
