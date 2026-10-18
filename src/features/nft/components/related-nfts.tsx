import { NftCarousel } from '@/features/catalog/components/nft-carousel'

/** "Mais desta coleção": NFTs da mesma série, sem o atual */
export function RelatedNfts({ nftId, collectionName }: { nftId: string; collectionName: string }) {
  return (
    <NftCarousel
      title="Mais desta coleção"
      params={{ collection: collectionName }}
      excludeIds={[nftId]}
    />
  )
}
