import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { nftListQueryOptions } from '@/queries/nfts'
import { cn } from '@/lib/utils'

const LIMIT = 15

/** "Mais desta coleção": carrossel com rolagem por encaixe e pontos de página */
export function RelatedNfts({ nftId, collectionName }: { nftId: string; collectionName: string }) {
  const { data, status } = useQuery(
    nftListQueryOptions({ collection: collectionName, pageSize: LIMIT + 1 }),
  )
  const items = data?.items.filter((nft) => nft.id !== nftId).slice(0, LIMIT) ?? []
  const track = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)

  // Calcula quantas "telas" de cards existem e qual está visível
  useEffect(() => {
    const element = track.current
    if (!element) return
    const update = () => {
      setPages(Math.max(1, Math.round(element.scrollWidth / element.clientWidth)))
      setPage(Math.round(element.scrollLeft / element.clientWidth))
    }
    update()
    element.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => {
      element.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [items.length])

  function goTo(index: number) {
    const element = track.current
    element?.scrollTo({ left: index * element.clientWidth, behavior: 'smooth' })
  }

  if (status === 'error' || (status === 'success' && items.length === 0)) return null

  return (
    <section aria-labelledby="related-title" className="mt-16 md:mt-24">
      <h2
        id="related-title"
        className="border-divider border-b pb-3 text-lg font-bold text-highlight"
      >
        Mais desta coleção
      </h2>

      <ul
        ref={track}
        tabIndex={-1}
        className="mt-8 flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto pb-2 md:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {status === 'pending'
          ? Array.from({ length: 5 }, (_, i) => (
              <li
                key={i}
                className="w-[calc(50%-0.5rem)] shrink-0 md:w-[calc(33.333%-1rem)] lg:w-[calc(20%-1.2rem)]"
              >
                <NftCardSkeleton />
              </li>
            ))
          : items.map((nft) => (
              <li
                key={nft.id}
                className="w-[calc(50%-0.5rem)] shrink-0 snap-start md:w-[calc(33.333%-1rem)] lg:w-[calc(20%-1.2rem)]"
              >
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>

      {pages > 1 && (
        <div
          role="group"
          aria-label="Páginas do carrossel"
          className="mt-6 flex justify-center gap-3"
        >
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ir para a página ${index + 1} de ${pages}`}
              aria-current={index === page ? 'true' : undefined}
              className={cn(
                'size-3 rounded-full border border-primary transition-colors',
                index === page ? 'bg-primary' : 'bg-transparent hover:bg-primary/40',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}
