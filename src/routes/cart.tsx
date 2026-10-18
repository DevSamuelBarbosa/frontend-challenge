import { createFileRoute } from '@tanstack/react-router'
import { useCart } from '@/queries/cart'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function CartPage() {
  const { items, query, owner, mutation, update, remove } = useCart()
  const ignore = () => undefined

  // Renderização provisória: a tela do Figma substitui este conteúdo
  return (
    <>
      <h1 className="text-2xl font-bold">Carrinho</h1>
      <p aria-live="polite">
        {owner && query.status === 'pending' && 'Carregando…'}
        {query.status === 'error' && `Erro: ${query.error.message}`}
        {mutation.isError && mutation.error.message}
      </p>
      {items.length === 0 && query.status !== 'pending' && <p>Seu carrinho está vazio.</p>}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.name} ({item.editionName}) · {item.unitPriceEth} ETH · {item.quantity}{' '}
            <button
              type="button"
              aria-label={`Diminuir quantidade de ${item.name}`}
              disabled={item.quantity <= 1}
              onClick={() => void update(item.id, item.quantity - 1).catch(ignore)}
            >
              −
            </button>
            <button
              type="button"
              aria-label={`Aumentar quantidade de ${item.name}`}
              disabled={item.quantity >= Math.min(item.available, item.maxPerOrder)}
              onClick={() => void update(item.id, item.quantity + 1).catch(ignore)}
            >
              +
            </button>
            <button type="button" onClick={() => void remove(item.id).catch(ignore)}>
              Remover
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
