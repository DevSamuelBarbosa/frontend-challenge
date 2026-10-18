import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { isApiError } from '@/api/errors'
import { NotFound } from '@/components/not-found'
import { stateActionClass } from '@/components/state-panel'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { orderQueryOptions } from '@/queries/orders'
import { OrderReceipt } from './order-receipt'

/**
 * Confirmação do pedido, como uma página própria com o botão de voltar ao início. A rota
 * `/orders/:id` funciona com acesso direto e refresh. O recibo só aparece para pedido
 * efetivamente confirmado: pendente e recusado mostram o estado real.
 */
export function OrderConfirmation({ orderId, userId }: { orderId: string; userId: string }) {
  const { data: order, status, error, refetch } = useQuery(orderQueryOptions(userId, orderId))

  if (isApiError(error) && error.code === 'not_found') {
    return (
      <NotFound title="Pedido não encontrado" description="Este pedido não existe ou não é seu." />
    )
  }

  return (
    <div className="page-container flex flex-col items-center pt-6 pb-8 md:pt-10">
      <div className="w-full max-w-[36.125rem] bg-card">
        {status === 'pending' ? (
          <Placeholder title="Carregando pedido">
            <div aria-busy="true" className="flex flex-col gap-4 p-6">
              <Skeleton className="mx-auto h-20 w-16" />
              <Skeleton className="h-6 w-3/4 self-center" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </Placeholder>
        ) : status === 'error' ? (
          <Placeholder title="Não foi possível carregar o pedido">
            <div role="alert" className="flex flex-col items-start gap-3 p-6 text-sm">
              <p>{error.message}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground"
              >
                Tentar novamente
              </button>
            </div>
          </Placeholder>
        ) : order.status === 'confirmed' ? (
          <OrderReceipt order={order} />
        ) : order.status === 'pending' ? (
          <Placeholder title="Pagamento pendente">
            <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
              <p role="status" className="flex items-center gap-3">
                <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
                Aguardando a confirmação da carteira…
              </p>
              <p className="text-sm text-muted-foreground">
                O recibo aparece aqui assim que o pagamento for confirmado. Pode recarregar a
                página: o pedido continua sendo acompanhado.
              </p>
            </div>
          </Placeholder>
        ) : (
          <Placeholder title="Pagamento recusado">
            <div role="alert" className="flex flex-col items-center gap-4 px-6 py-10 text-center">
              <p>{order.rejectionReason ?? 'A carteira recusou o pagamento.'}</p>
              <p className="text-sm text-muted-foreground">
                Nada foi cobrado e seus itens continuam no carrinho.
              </p>
              <Link
                to="/cart"
                className="grid h-10 place-items-center rounded-md bg-primary px-6 font-bold text-primary-foreground"
              >
                Voltar ao carrinho
              </Link>
            </div>
          </Placeholder>
        )}
        {order?.status === 'confirmed' && <div aria-hidden className="h-2.5 bg-primary" />}
      </div>

      <Link to="/" className={cn(stateActionClass, 'mt-8 max-md:w-full')}>
        Voltar para a tela inicial
      </Link>
    </div>
  )
}

/** Título da página nos estados que não são o recibo */
function Placeholder({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h1 className="px-6 pt-8 text-center text-base font-bold text-muted-foreground">{title}</h1>
      {children}
    </>
  )
}
