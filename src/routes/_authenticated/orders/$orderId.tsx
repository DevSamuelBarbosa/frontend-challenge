import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { isApiError } from '@/api/errors'
import { NotFound } from '@/components/not-found'
import { orderQueryOptions } from '@/queries/orders'

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  component: OrderConfirmationPage,
})

// Renderização provisória: a tela do Figma substitui este conteúdo
function OrderConfirmationPage() {
  const { orderId } = Route.useParams()
  const { session } = Route.useRouteContext()
  const { data: order, status, error } = useQuery(orderQueryOptions(session.user.id, orderId))

  if (isApiError(error) && error.code === 'not_found') {
    return (
      <NotFound title="Pedido não encontrado" description="Este pedido não existe ou não é seu." />
    )
  }
  if (status === 'pending') return <p aria-live="polite">Carregando pedido…</p>
  if (status === 'error') return <p role="alert">{error.message}</p>

  // O recibo só aparece para pedido confirmado na simulação
  if (order.status === 'pending') {
    return (
      <p aria-live="polite">
        Pedido {order.id} aguardando confirmação do pagamento.{' '}
        <Link to="/checkout">Acompanhar</Link>
      </p>
    )
  }
  if (order.status === 'rejected') {
    return (
      <p role="alert">
        O pagamento do pedido {order.id} foi recusado: {order.rejectionReason}.{' '}
        <Link to="/cart">Voltar ao carrinho</Link>
      </p>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Pedido confirmado</h1>
      <p>
        Pedido {order.id} · transação {order.transaction?.hash} (simulada) ·{' '}
        <a href={order.transaction?.explorerUrl} target="_blank" rel="noreferrer">
          ver no explorador (simulado)
        </a>
      </p>
      <ul>
        {order.lines.map((line) => (
          <li key={line.editionId}>
            {line.name} ({line.editionName}) · {line.quantity} × {line.unitPriceEth} ={' '}
            {line.lineTotalEth} ETH
          </li>
        ))}
      </ul>
      <p>
        Subtotal {order.subtotalEth} · Desconto {order.discountEth} · Taxa {order.networkFeeEth} ·{' '}
        <strong>Total {order.totalEth} ETH</strong>
      </p>
    </>
  )
}
