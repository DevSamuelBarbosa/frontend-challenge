import { X } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import type { CartItem } from '@/api/contracts'
import { formatEth } from '@/lib/format'
import { realtimeNotices } from '@/realtime/store'

/**
 * Avisos de alteração recebidos em tempo real enquanto o carrinho está aberto
 * (preço ou disponibilidade de um item mudou). São anunciados aos leitores de tela.
 */
export function CartNotices({ items }: { items: CartItem[] }) {
  const notices = useSyncExternalStore(realtimeNotices.subscribe, realtimeNotices.get)
  // Só os avisos de itens que estão no carrinho
  const visible = notices.filter((n) => items.some((i) => i.editionId === n.editionId))

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      {visible.map((notice) => (
        <div
          key={notice.id}
          className="flex items-start justify-between gap-3 border border-primary bg-band px-4 py-3 text-sm"
        >
          <p>
            {notice.kind === 'price_changed' ? (
              <>
                O preço de <strong>{notice.name}</strong> ({notice.editionName}) mudou de{' '}
                {formatEth(notice.previous)} para <strong>{formatEth(notice.current)}</strong>. O
                resumo foi atualizado.
              </>
            ) : (
              <>
                A disponibilidade de <strong>{notice.name}</strong> ({notice.editionName}) mudou de{' '}
                {notice.previous} para <strong>{notice.current}</strong>{' '}
                {Number(notice.current) === 1 ? 'unidade' : 'unidades'}.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => realtimeNotices.dismiss(notice.id)}
            aria-label="Dispensar aviso"
            className="shrink-0 rounded-md p-0.5 hover:text-highlight"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}
