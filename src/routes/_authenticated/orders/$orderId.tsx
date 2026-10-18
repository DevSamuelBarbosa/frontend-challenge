import { createFileRoute } from '@tanstack/react-router'
import { OrderConfirmation } from '@/features/orders/components/order-confirmation'
import { useDocumentTitle } from '@/hooks/use-document-title'

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  component: OrderConfirmationPage,
})

function OrderConfirmationPage() {
  const { orderId } = Route.useParams()
  const { session } = Route.useRouteContext()
  useDocumentTitle('Confirmação do pedido')
  return <OrderConfirmation orderId={orderId} userId={session.user.id} />
}
