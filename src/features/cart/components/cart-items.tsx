import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import type { CartItem } from '@/api/contracts'
import { NftImage } from '@/components/nft-image'
import { QuantityStepper } from '@/components/quantity-stepper'
import { Skeleton } from '@/components/ui/skeleton'
import { mulEth } from '@/lib/eth'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isUnavailable, maxQuantity } from '../availability'

interface ItemActions {
  /** Item com uma alteração em andamento: os controles ficam desabilitados */
  pendingItemId: string | null
  onQuantity: (item: CartItem, quantity: number) => void
  onRemove: (item: CartItem) => void
}

/** Aviso de indisponibilidade, com a ação de ajustar a quantidade */
function Warning({ item, onQuantity }: { item: CartItem; onQuantity: ItemActions['onQuantity'] }) {
  const max = maxQuantity(item)
  if (!isUnavailable(item)) return null
  return (
    <p className="mt-1 text-xs text-required">
      {max === 0 ? (
        'Esgotado. Remova este item para continuar.'
      ) : (
        <>
          {max === 1 ? 'Apenas 1 unidade disponível.' : `Apenas ${max} unidades disponíveis.`}{' '}
          <button
            type="button"
            onClick={() => onQuantity(item, max)}
            className="font-bold underline underline-offset-2"
          >
            Ajustar para {max}
          </button>
        </>
      )}
    </p>
  )
}

function ItemStepper({ item, pendingItemId, onQuantity }: { item: CartItem } & ItemActions) {
  const max = Math.max(maxQuantity(item), 1)
  return (
    <QuantityStepper
      compact
      label={`Quantidade de ${item.name}`}
      value={item.quantity}
      max={max}
      disabled={pendingItemId === item.id}
      onChange={(quantity) => onQuantity(item, quantity)}
    />
  )
}

function RemoveButton({ item, pendingItemId, onRemove }: { item: CartItem } & ItemActions) {
  return (
    <button
      type="button"
      onClick={() => onRemove(item)}
      disabled={pendingItemId === item.id}
      aria-label={`Remover ${item.name} do carrinho`}
      className="grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:text-highlight disabled:opacity-50"
    >
      <Trash2 className="size-5" aria-hidden />
    </button>
  )
}

/** Tabela do desktop: NFTs, preço, quantidade (a coluna "Edições" do design) e total */
export function CartTable({ items, ...actions }: { items: CartItem[] } & ItemActions) {
  const th = 'pb-2 text-left text-base font-bold'
  return (
    <table className="w-full border-separate border-spacing-y-3">
      <caption className="sr-only">Itens do carrinho</caption>
      <thead>
        <tr className="[&>th]:border-divider [&>th]:border-b">
          <th scope="col" className={th}>
            NFTs
          </th>
          <th scope="col" className={th}>
            Preço
          </th>
          <th scope="col" className={th}>
            Edições<span className="sr-only"> (quantidade)</span>
          </th>
          <th scope="col" className={th}>
            Total
          </th>
          <th scope="col" className="w-14">
            <span className="sr-only">Remover</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            className={cn(
              'bg-card [&>td]:py-2',
              isUnavailable(item) && 'outline outline-1 outline-required',
            )}
          >
            <td className="pr-4">
              <div className="flex items-center gap-4">
                <NftImage
                  image={item.image}
                  sizes="70px"
                  decorative
                  className="size-[4.375rem] shrink-0 rounded-md"
                />
                <div className="min-w-0">
                  <Link
                    to="/nfts/$nftId"
                    params={{ nftId: item.nftId }}
                    className="font-bold hover:text-highlight"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">ID do token: {item.tokenId}</p>
                  <p className="text-sm text-muted-foreground">Edição: {item.editionName}</p>
                  <Warning item={item} onQuantity={actions.onQuantity} />
                </div>
              </div>
            </td>
            <td className="pr-4 font-bold text-highlight">{formatEth(item.unitPriceEth)}</td>
            <td className="pr-4">
              <ItemStepper item={item} {...actions} />
            </td>
            <td className="pr-4 font-bold text-highlight">
              {formatEth(mulEth(item.unitPriceEth, item.quantity))}
            </td>
            <td className="pr-2">
              <RemoveButton item={item} {...actions} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Cards do mobile: mostram o total da linha, como no design */
export function CartCards({ items, ...actions }: { items: CartItem[] } & ItemActions) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            'flex overflow-hidden rounded-2xl bg-card',
            isUnavailable(item) && 'outline outline-1 outline-required',
          )}
        >
          <NftImage
            image={item.image}
            sizes="100px"
            decorative
            className="size-[6.25rem] shrink-0 self-stretch rounded-none"
          />
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-3">
            <div>
              <Link
                to="/nfts/$nftId"
                params={{ nftId: item.nftId }}
                className="block truncate text-sm font-bold"
              >
                {item.name}
              </Link>
              <p className="text-xs text-muted-foreground">Edição: {item.editionName}</p>
              <Warning item={item} onQuantity={actions.onQuantity} />
            </div>
            <div className="flex items-end justify-between gap-2">
              <p className="text-lg font-bold text-highlight">
                {formatEth(mulEth(item.unitPriceEth, item.quantity))}
              </p>
              <div className="flex items-center gap-1">
                <ItemStepper item={item} {...actions} />
                <RemoveButton item={item} {...actions} />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Mesmas proporções das linhas reais, para o layout não se deslocar */
export function CartItemsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando itens do carrinho" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-[5.375rem] w-full md:h-[5.5rem]" />
      ))}
    </div>
  )
}
