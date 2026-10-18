import { ArrowRight } from 'lucide-react'
import { UnavailableButton, UnavailableLink } from '@/components/unavailable'

/*
 * Conteúdo editorial da tela inicial (banners e "Diário da Cunhagem"). É texto
 * estático do design: não há página de editorial na entrega, então "Explorar" e
 * "Ler mais" aparecem desabilitados. As imagens são os mesmos assets do design.
 */

const imageSrc = (artwork: string, width: number) => `/images/nfts/${artwork}-${width}.webp`

function Picture({
  artwork,
  sizes,
  className,
}: {
  artwork: string
  sizes: string
  className?: string
}) {
  return (
    <img
      src={imageSrc(artwork, 480)}
      srcSet={[240, 480, 960].map((w) => `${imageSrc(artwork, w)} ${w}w`).join(', ')}
      sizes={sizes}
      width={960}
      height={960}
      alt=""
      loading="lazy"
      decoding="async"
      className={className}
    />
  )
}

const BANNERS = [
  {
    artwork: 'emerald-ape',
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
  },
  {
    artwork: 'ivory-ape',
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura da internet.',
  },
]

const ARTICLES = [
  {
    artwork: 'ivory-ape',
    date: '12 de setembro',
    reading: 6,
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
  },
  {
    artwork: 'emerald-ape',
    date: '13 de setembro',
    reading: 2,
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
  },
  {
    artwork: 'nomad-gorilla',
    date: '15 de setembro',
    reading: 3,
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
  },
  {
    artwork: 'golden-ape',
    date: '15 de setembro',
    reading: 2,
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
  },
]

export function PromoBanners() {
  return (
    <section aria-label="Destaques da Kurio" className="page-container mt-20 md:mt-28">
      <ul className="grid gap-5 lg:grid-cols-2 lg:gap-7">
        {BANNERS.map((banner) => (
          <li
            key={banner.title}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-stretch overflow-hidden rounded-md bg-card sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]"
          >
            <Picture
              artwork={banner.artwork}
              sizes="(min-width: 1024px) 290px, 45vw"
              className="aspect-square h-full w-full rounded-[1.25rem] object-cover"
            />
            <div className="flex flex-col items-end justify-between gap-4 p-4 text-right md:p-6">
              <div>
                <h2 className="text-base leading-snug font-bold md:text-lg">{banner.title}</h2>
                <p className="mt-3 text-xs leading-6 text-muted-foreground md:text-sm">
                  {banner.text}
                </p>
              </div>
              <UnavailableButton className="inline-flex h-10 items-center gap-1 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground">
                Explorar <ArrowRight className="size-4" aria-hidden />
              </UnavailableButton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function MintingJournal() {
  return (
    <section aria-labelledby="journal-title" className="page-container mt-20 md:mt-28">
      <h2 id="journal-title" className="text-center text-2xl font-bold md:text-[1.75rem]">
        Diário da Cunhagem
      </h2>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>

      <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ARTICLES.map((article) => (
          <li key={article.title}>
            <article className="flex h-full flex-col overflow-hidden rounded-md bg-card">
              <Picture
                artwork={article.artwork}
                sizes="(min-width: 1024px) 268px, 45vw"
                className="aspect-[4/3] w-full object-cover object-top"
              />
              <div className="flex flex-1 flex-col p-4">
                <p className="text-xs text-muted-foreground">
                  <time>{article.date}</time>
                  <span aria-hidden> &nbsp;|&nbsp; </span>
                  <span className="sr-only">, </span>
                  Leitura de {article.reading} min
                </p>
                <h3 className="mt-3 text-base leading-snug font-bold">{article.title}</h3>
                <p className="mt-2 flex-1 text-xs leading-5 text-muted-foreground">
                  {article.text}
                </p>
                <UnavailableLink className="mt-3 text-xs font-bold text-highlight">
                  Ler mais →
                </UnavailableLink>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
