import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { NftImage } from '@/components/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { nftListQueryOptions } from '@/queries/nfts'

const FEATURED_PARAMS = { featured: true, pageSize: 3 }

/** "NFT em destaque": vem da API (NFTs marcados como destaque), com link para o detalhe */
export function FeaturedCard() {
  const { data, status } = useQuery(nftListQueryOptions(FEATURED_PARAMS))
  // O segundo destaque, para não repetir a arte principal do hero
  const nft = data?.items[1] ?? data?.items[0]

  if (status === 'error' || (status === 'success' && !nft)) return null

  return (
    <section
      aria-labelledby="featured-title"
      className="relative overflow-hidden bg-gradient-to-b from-band/60 to-transparent"
    >
      <div className="px-5 pt-6 pb-3 text-center">
        <h2 id="featured-title" className="text-left text-[1.375rem] font-bold text-highlight">
          NFT EM DESTAQUE
        </h2>
        <p className="mt-2 text-xl font-bold">OFERTA LIMITADA</p>
      </div>
      {nft ? (
        <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="block">
          <NftImage image={nft.image} sizes="310px" className="w-full rounded-[1.25rem]" />
          <span className="sr-only">Ver {nft.name}</span>
        </Link>
      ) : (
        <Skeleton className="aspect-square w-full rounded-[1.25rem]" />
      )}
    </section>
  )
}
