import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  return <h1 className="text-2xl font-bold">Pagamento</h1>
}
