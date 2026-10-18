import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  component: OrderConfirmationPage,
})

function OrderConfirmationPage() {
  const { orderId } = Route.useParams()
  return <h1 className="text-2xl font-bold">Pedido {orderId}</h1>
}
