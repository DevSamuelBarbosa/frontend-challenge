import type { Nft } from '@/api/contracts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { shortAddress } from '@/lib/format'
import { RatingStars } from './rating-stars'

const tabTrigger =
  'relative h-auto flex-none rounded-none border-0 bg-transparent px-0 pt-0 pb-2 text-base text-foreground shadow-none transition-colors hover:text-highlight data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-highlight data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-transparent'

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** Abas "Detalhes do NFT" e "Avaliações de colecionadores" */
export function NftTabs({ nft }: { nft: Nft }) {
  const networkName = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }[nft.network]
  return (
    <Tabs defaultValue="details" className="gap-0">
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-6 rounded-none border-b p-0 md:gap-8"
      >
        <TabsTrigger value="details" className={tabTrigger}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className={tabTrigger}>
          Avaliações<span className="max-md:sr-only"> de colecionadores</span> ({nft.rating.count})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="mt-4 text-sm leading-6 text-muted-foreground">
        {nft.details.map((paragraph) => (
          <p key={paragraph} className="mb-6 last:mb-0">
            {paragraph}
          </p>
        ))}
        <dl className="mt-6 flex flex-col gap-3">
          <div>
            <dt className="font-bold text-foreground">Rede:</dt>
            <dd>
              Cunhado na {networkName} com procedência imutável e metadados armazenados no IPFS.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Contrato:</dt>
            <dd>
              <abbr title={nft.contract.address} className="no-underline">
                {shortAddress(nft.contract.address)}
              </abbr>{' '}
              • Contrato inteligente {nft.contract.standard} verificado.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Direitos autorais:</dt>
            <dd>
              Direitos autorais do criador: {nft.contract.royaltyPercent}% nas vendas secundárias,
              pagos automaticamente pelos mercados compatíveis.
            </dd>
          </div>
        </dl>
      </TabsContent>

      <TabsContent value="reviews" className="mt-4">
        <p className="flex items-center gap-3 text-sm text-muted-foreground">
          <RatingStars rating={nft.rating.average} />
          {nft.rating.average.toFixed(1)} de 5 · {nft.rating.count} avaliações
        </p>
        <ul className="mt-5 flex flex-col gap-5">
          {nft.reviews.map((review) => (
            <li key={review.id} className="border-divider border-b pb-5 last:border-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold">{review.author}</span>
                <RatingStars rating={review.rating} />
                <time dateTime={review.createdAt} className="text-xs text-muted-foreground">
                  {dateFormat.format(new Date(review.createdAt))}
                </time>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.comment}</p>
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  )
}
