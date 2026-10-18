import { Link } from '@tanstack/react-router'
import { Heart, Search, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import type { NftSummary } from '@/api/contracts'
import { NftImage } from '@/components/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCart } from '@/queries/cart'
import { useFavorites } from '@/queries/favorites'

/** Largura exibida da imagem do card, para o `srcset` */
const CARD_IMAGE_SIZES = '(min-width: 1024px) 250px, (min-width: 768px) 30vw, 45vw'

const actionButton =
  'grid size-[2.125rem] place-items-center rounded-md bg-background/90 text-foreground transition-colors hover:text-highlight disabled:cursor-not-allowed disabled:opacity-50'

interface NftCardProps {
  nft: NftSummary
  /** Imagem acima da dobra: carrega sem `lazy` */
  priority?: boolean
}

/**
 * Card do catálogo. O card inteiro leva ao detalhe (link esticado sobre o card);
 * as ações ficam fora do link, como botões próprios, para a navegação por
 * teclado e os leitores de tela não confundirem as duas coisas.
 */
export function NftCard({ nft, priority }: NftCardProps) {
  const { isFavorite, toggle } = useFavorites()
  const { add, mutation } = useCart()
  const favorite = isFavorite(nft.id)
  const soldOut = nft.available === 0

  function addToCart() {
    add({ nftId: nft.id, editionId: nft.defaultEditionId, quantity: 1 }).then(
      () => toast.success(`${nft.name} foi adicionado ao carrinho`),
      (error: Error) => toast.error(error.message),
    )
  }

  return (
    <article className="group relative flex h-full flex-col rounded-3xl bg-card p-1.5 pb-4 md:block md:h-auto md:rounded-none md:bg-transparent md:p-0">
      <div className="relative rounded-[1.25rem] md:rounded-none md:bg-card md:px-1 md:py-6">
        <NftImage
          image={nft.image}
          sizes={CARD_IMAGE_SIZES}
          priority={priority}
          decorative
          className="w-full rounded-[1.25rem] md:rounded-xl"
        />
        {nft.rarity === 'rare' && (
          <span className="absolute top-0 left-0 rounded-tl-[1.25rem] bg-primary px-2.5 py-1 text-sm font-bold text-primary-foreground md:rounded-none md:px-3.5 md:text-base">
            RARO
          </span>
        )}
        {soldOut && (
          <span className="absolute top-3 right-3 rounded-md bg-background/90 px-2 py-1 text-xs font-bold md:top-8 md:right-4">
            ESGOTADO
          </span>
        )}
      </div>

      {/* No celular o nome quebra em até duas linhas; a altura dos cards da linha é igualada pela grade */}
      <h3 className="mt-3 px-2 text-sm leading-snug break-words md:truncate md:px-0 md:text-base">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-ring"
        >
          {nft.name}
        </Link>
      </h3>
      <p className="mt-0.5 px-2 text-base font-bold text-highlight md:px-0 md:text-lg">
        <span className="sr-only">Preço: </span>
        {formatEth(nft.priceEth)}
        {nft.compareAtPriceEth && (
          <span className="block font-normal text-muted-foreground line-through md:ml-2 md:inline">
            <span className="sr-only">, antes </span>
            {formatEth(nft.compareAtPriceEth)}
          </span>
        )}
      </p>

      {/* Mobile: favoritar sempre visível sobre a imagem */}
      <button
        type="button"
        onClick={() => toggle(nft.id)}
        aria-pressed={favorite}
        aria-label={favorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
        className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full bg-card/80 text-foreground md:hidden"
      >
        <Heart className="size-5" aria-hidden fill={favorite ? 'currentColor' : 'none'} />
      </button>

      {/* Desktop: ações ao passar o mouse ou focar pelo teclado */}
      <div className="absolute top-[calc(100%-6.75rem)] left-1/2 z-10 hidden -translate-x-1/2 gap-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:flex">
        <button
          type="button"
          onClick={addToCart}
          disabled={soldOut || mutation.isPending}
          className={actionButton}
          aria-label={soldOut ? `${nft.name} esgotado` : `Adicionar ${nft.name} ao carrinho`}
        >
          <ShoppingCart className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => toggle(nft.id)}
          aria-pressed={favorite}
          aria-label={favorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
          className={cn(actionButton, favorite && 'text-highlight')}
        >
          <Heart className="size-5" aria-hidden fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          className={actionButton}
          aria-label={`Ver detalhes de ${nft.name}`}
          tabIndex={-1}
        >
          <Search className="size-5" aria-hidden />
        </Link>
      </div>
    </article>
  )
}

/** Mesmas dimensões do card, para o layout não se deslocar ao carregar */
export function NftCardSkeleton() {
  return (
    <div className="h-full rounded-3xl bg-card p-1.5 pb-4 md:h-auto md:rounded-none md:bg-transparent md:p-0">
      <div className="rounded-[1.25rem] md:rounded-none md:bg-card md:px-1 md:py-6">
        <Skeleton className="aspect-square w-full rounded-[1.25rem] bg-band md:rounded-xl" />
      </div>
      <Skeleton className="mx-2 mt-3 h-6 w-3/4 md:mx-0" />
      <Skeleton className="mx-2 mt-1 h-7 w-1/3 md:mx-0" />
    </div>
  )
}
