import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/wallets')({
  component: WalletsPage,
})

function WalletsPage() {
  return <h1 className="text-2xl font-bold">Carteiras</h1>
}
