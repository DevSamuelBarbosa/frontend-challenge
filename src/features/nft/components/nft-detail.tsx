import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Heart, ShoppingCart, Star } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { EthAmount, Nft, NftEdition } from '@/api/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsDesktop } from '@/hooks/use-media-query'
import { compareEth } from '@/lib/eth'
import { mulEth } from '@/lib/eth'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCart } from '@/queries/cart'
import { useFavorites } from '@/queries/favorites'
import { EditionPicker } from './edition-picker'
import { NftGallery } from './nft-gallery'
import { NftTabs } from './nft-tabs'
import { QuantityStepper } from '@/components/quantity-stepper'
import { RatingStars } from './rating-stars'
import { RelatedNfts } from './related-nfts'
import { ShareLinks } from './share-links'

/** Edição inicial: a mais barata entre as disponíveis (a mesma exibida no card do catálogo) */
function defaultEdition(editions: NftEdition[]) {
  const available = editions.filter((e) => e.available > 0)
  return (available.length > 0 ? available : editions).reduce((min, e) =>
    compareEth(e.priceEth, min.priceEth) < 0 ? e : min,
  )
}

/** Máximo que o usuário pode comprar de uma vez: o menor entre o estoque e o limite por pedido */
const maxQuantity = (edition: NftEdition) => Math.min(edition.available, edition.maxPerOrder)

function limitMessage(edition: NftEdition, quantity: number) {
  const max = maxQuantity(edition)
  if (max === 0) return 'Esta edição está esgotada.'
  if (quantity < max) return null
  return edition.maxPerOrder <= edition.available
    ? `Limite de ${edition.maxPerOrder} ${edition.maxPerOrder === 1 ? 'unidade' : 'unidades'} por pedido.`
    : `Apenas ${edition.available} ${edition.available === 1 ? 'unidade disponível' : 'unidades disponíveis'}.`
}

export function NftDetail({ nft }: { nft: Nft }) {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const cart = useCart()
  const { isFavorite, toggle } = useFavorites()

  // A edição inicial é escolhida uma vez, ao abrir a página: se o preço ou o estoque mudarem
  // depois (evento em tempo real), a seleção do usuário não pula para outra edição
  const [editionId, setEditionId] = useState(() => defaultEdition(nft.editions).id)
  const [requested, setRequested] = useState(1)
  const edition = nft.editions.find((e) => e.id === editionId) ?? defaultEdition(nft.editions)
  const max = maxQuantity(edition)
  // O estoque pode cair com o detalhe aberto (evento em tempo real): a quantidade acompanha
  const quantity = max === 0 ? 1 : Math.min(requested, max)
  const soldOut = max === 0
  const favorite = isFavorite(nft.id)
  const message = limitMessage(edition, quantity)
  // O valor exibido acompanha a quantidade escolhida
  const total = mulEth(edition.priceEth, quantity)
  const compareTotal = edition.compareAtPriceEth
    ? mulEth(edition.compareAtPriceEth, quantity)
    : null
  const url = typeof window === 'undefined' ? '' : window.location.href

  function selectEdition(id: string) {
    setEditionId(id)
    setRequested(1)
  }

  async function addToCart(goToCart: boolean) {
    try {
      await cart.add({ nftId: nft.id, editionId: edition.id, quantity })
      if (goToCart) await navigate({ to: '/cart' })
      else toast.success(`${nft.name} (${edition.name}) foi adicionado ao carrinho`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível adicionar ao carrinho')
    }
  }

  const favoriteButton = (
    <button
      type="button"
      onClick={() => toggle(nft.id)}
      aria-pressed={favorite}
      className="inline-flex h-10 items-center gap-2 rounded-md border border-primary px-4 text-base transition-colors hover:bg-primary/10"
    >
      <Heart className="size-5" aria-hidden fill={favorite ? 'currentColor' : 'none'} />
      {favorite ? 'Favoritado' : 'Favoritar'}
    </button>
  )

  return (
    <>
      <div className="md:page-container md:pt-4">
        {isDesktop && <Breadcrumb />}

        <div className="md:mt-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
          {/* Imagem: no celular ocupa o topo, com voltar e favoritar sobre ela */}
          <div className="relative bg-card px-7 pt-[4.25rem] md:bg-transparent md:p-0">
            {!isDesktop && (
              <MobileTopActions favorite={favorite} onToggleFavorite={() => toggle(nft.id)} />
            )}
            <NftGallery name={nft.name} images={nft.images} />
          </div>

          <div className="relative z-10 -mt-9 rounded-t-[2.5rem] bg-card px-6 pt-6 pb-8 shadow-[0_-10px_24px_rgba(0,0,0,0.25)] md:mt-0 md:rounded-none md:bg-transparent md:p-0 md:shadow-none">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl leading-tight font-bold md:text-[1.75rem]">{nft.name}</h1>
              {!isDesktop && (
                <span className="inline-flex shrink-0 items-center rounded-full border border-primary px-3 py-1 text-sm">
                  <Star aria-hidden className="mr-1.5 size-4 fill-primary text-primary" />
                  <span className="font-bold">{nft.rating.average.toFixed(1)}</span>
                  <span className="text-muted-foreground">({nft.rating.count})</span>
                  <span className="sr-only">avaliações de colecionadores</span>
                </span>
              )}
            </div>

            {isDesktop && (
              <div className="border-divider mt-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <p
                  className="text-xl font-bold text-highlight"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span className="sr-only">Preço: </span>
                  {formatEth(total)}
                  {compareTotal && (
                    <span className="ml-3 text-base font-normal text-muted-foreground line-through">
                      <span className="sr-only">, antes </span>
                      {formatEth(compareTotal)}
                    </span>
                  )}
                  {quantity > 1 && (
                    <span className="ml-3 text-sm font-normal text-muted-foreground">
                      ({quantity} × {formatEth(edition.priceEth)})
                    </span>
                  )}
                </p>
                <p className="flex items-center gap-2 text-base">
                  <RatingStars rating={nft.rating.average} />
                  {nft.rating.count} avaliações de colecionadores
                </p>
              </div>
            )}

            <section className="mt-4">
              <h2 className="hidden text-base font-bold md:block">Sobre este NFT:</h2>
              <p className="line-clamp-3 text-sm leading-6 text-muted-foreground md:mt-3 md:line-clamp-none">
                {nft.description}
              </p>
            </section>

            <div className="mt-4">
              <EditionPicker editions={nft.editions} value={edition.id} onChange={selectEdition} />
            </div>

            {isDesktop && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <QuantityStepper value={quantity} max={max} onChange={setRequested} />
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => void addToCart(true)}
                    disabled={soldOut || cart.mutation.isPending}
                    className="h-10 rounded-md bg-primary px-8 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {soldOut ? 'ESGOTADO' : 'COMPRAR'}
                  </button>
                  {favoriteButton}
                </div>
              </div>
            )}

            <p role="status" className={cn('mt-3 text-sm text-highlight', !message && 'sr-only')}>
              {message}
            </p>

            <dl className="mt-4 flex flex-col gap-2.5 text-[0.9375rem] text-muted-foreground md:mt-5 md:gap-3.5 md:text-base">
              <div>
                <dt className="inline">ID do token: </dt>
                <dd className="inline">{nft.tokenId}</dd>
              </div>
              <div>
                <dt className="inline">Coleção: </dt>
                <dd className="inline">{nft.collectionName}</dd>
              </div>
              <div>
                <dt className="inline">Atributos: </dt>
                <dd className="inline">{nft.attributes.join(', ')}</dd>
              </div>
            </dl>

            {isDesktop && (
              <div className="mt-3">
                <ShareLinks name={nft.name} url={url} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-container mt-12 md:mt-20">
        <NftTabs nft={nft} />
        <RelatedNfts nftId={nft.id} collectionName={nft.collectionName} />
      </div>

      {!isDesktop && (
        <MobileBuyBar
          unitPrice={edition.priceEth}
          total={total}
          quantity={quantity}
          max={max}
          soldOut={soldOut}
          pending={cart.mutation.isPending}
          onQuantity={setRequested}
          onBuy={() => void addToCart(true)}
          onAdd={() => void addToCart(false)}
        />
      )}
    </>
  )
}

function Breadcrumb() {
  return (
    <nav aria-label="Trilha de navegação" className="text-base font-bold">
      <ol className="flex gap-2">
        <li>
          <Link to="/" className="hover:text-highlight">
            Início
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>
          <Link to="/" hash="mercado" className="hover:text-highlight" aria-current="page">
            Mercado
          </Link>
        </li>
      </ol>
    </nav>
  )
}

function MobileTopActions({
  favorite,
  onToggleFavorite,
}: {
  favorite: boolean
  onToggleFavorite: () => void
}) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const round =
    'grid size-10 place-items-center rounded-full border border-input bg-card/80 text-highlight'
  return (
    <div className="absolute inset-x-6 top-5 z-10 flex justify-between">
      <button
        type="button"
        className={round}
        aria-label="Voltar"
        onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: '/' }))}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        className={round}
        aria-pressed={favorite}
        aria-label={favorite ? 'Remover dos favoritos' : 'Favoritar'}
        onClick={onToggleFavorite}
      >
        <Heart className="size-5" aria-hidden fill={favorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

interface MobileBuyBarProps {
  unitPrice: EthAmount
  total: EthAmount
  quantity: number
  max: number
  soldOut: boolean
  pending: boolean
  onQuantity: (value: number) => void
  onBuy: () => void
  onAdd: () => void
}

/** Barra de compra fixa do celular: quantidade, preço, "Comprar NFT" e adicionar ao carrinho */
function MobileBuyBar({
  unitPrice,
  total,
  quantity,
  max,
  soldOut,
  pending,
  onQuantity,
  onBuy,
  onAdd,
}: MobileBuyBarProps) {
  return (
    <div className="border-divider fixed inset-x-0 bottom-0 z-40 rounded-t-[2.5rem] border-t bg-card px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">Qtd.</span>
          <QuantityStepper value={quantity} max={max} onChange={onQuantity} compact />
        </div>
        <p className="text-right" aria-live="polite" aria-atomic="true">
          <span className="block text-xl font-bold text-highlight">
            <span className="sr-only">Preço: </span>
            {formatEth(total)}
          </span>
          {quantity > 1 && (
            <span className="block text-xs text-muted-foreground">
              {quantity} × {formatEth(unitPrice)}
            </span>
          )}
        </p>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBuy}
          disabled={soldOut || pending}
          className="h-14 flex-1 rounded-full bg-gradient-to-br from-primary to-[#a8683a] text-base font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {soldOut ? 'Esgotado' : 'Comprar NFT'}
        </button>
        <button
          type="button"
          onClick={onAdd}
          disabled={soldOut || pending}
          aria-label="Adicionar ao carrinho"
          className="grid size-14 place-items-center rounded-full border border-input bg-background/40 text-highlight disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingCart className="size-6" aria-hidden />
        </button>
      </div>
    </div>
  )
}

/** Mesmas dimensões do conteúdo, para o layout não se deslocar ao carregar */
export function NftDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando NFT" className="md:page-container md:pt-4">
      <Skeleton className="hidden h-6 w-48 md:block" />
      <div className="md:mt-4 md:grid md:grid-cols-2 md:gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="bg-card px-7 pt-[4.25rem] pb-12 md:bg-transparent md:p-0">
          <Skeleton className="aspect-square w-full rounded-[1.25rem] bg-band md:rounded-none" />
        </div>
        <div className="-mt-10 flex flex-col gap-4 rounded-t-[2.5rem] bg-card px-6 pt-6 pb-8 md:mt-0 md:bg-transparent md:p-0">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>

      {/* Abas e "Mais desta coleção": reservam o espaço para o footer não se deslocar */}
      <div className="mt-12 px-4 md:mt-20 md:px-0">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="mt-6 h-56 w-full" />
        <Skeleton className="mt-16 h-[28rem] w-full" />
      </div>
    </div>
  )
}
