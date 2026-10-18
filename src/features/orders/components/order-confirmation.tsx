import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { isApiError } from '@/api/errors'
import { NotFound } from '@/components/not-found'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { orderQueryOptions } from '@/queries/orders'
import { OrderReceipt } from './order-receipt'

/**
 * Confirmação do pedido, em modal (um diálogo no desktop e em tela cheia no celular). A rota
 * `/orders/:id` funciona com acesso direto e refresh. O recibo só aparece para pedido
 * efetivamente confirmado: pendente e recusado mostram o estado real.
 */
export function OrderConfirmation({ orderId, userId }: { orderId: string; userId: string }) {
  const navigate = useNavigate()
  const { data: order, status, error, refetch } = useQuery(orderQueryOptions(userId, orderId))

  if (isApiError(error) && error.code === 'not_found') {
    return (
      <NotFound title="Pedido não encontrado" description="Este pedido não existe ou não é seu." />
    )
  }

  const close = () => void navigate({ to: '/' })

  return (
    <div className="min-h-[60dvh]">
      <Dialog open onOpenChange={(open) => !open && close()}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          className="max-h-[92dvh] w-full max-w-none gap-0 overflow-y-auto rounded-none border-0 bg-card p-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:translate-x-0 max-sm:translate-y-0 sm:max-w-[36.125rem] [&>button]:top-5 [&>button]:right-5 [&>button]:text-primary [&>button]:opacity-100"
        >
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
          {order?.status === 'confirmed' && (
            <div aria-hidden className="h-2.5 shrink-0 bg-primary" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Título e descrição exigidos pelo diálogo nos estados que não são o recibo */
function Placeholder({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <DialogTitle className="px-6 pt-8 text-center text-base font-bold text-muted-foreground">
        {title}
      </DialogTitle>
      <DialogDescription className="sr-only">Situação do pedido</DialogDescription>
      {children}
    </>
  )
}
