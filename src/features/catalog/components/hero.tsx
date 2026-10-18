import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useIsDesktop } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

/**
 * Vitrine editorial da tela inicial. As imagens são os assets estáticos do
 * design (não dependem da API): o hero é o maior elemento acima da dobra e
 * precisa aparecer o quanto antes.
 */
const SLIDES = [
  { artwork: 'emerald-ape', alt: 'Emerald Ape #042: macaco de óculos redondos e jaqueta verde' },
  { artwork: 'nomad-gorilla', alt: 'Sage Nomad #009: gorila de chapéu verde e moletom roxo' },
  { artwork: 'golden-ape', alt: 'Golden Beat #207: macaco dourado com fone de ouvido' },
] as const

const srcSet = (artwork: string) =>
  [240, 480, 960].map((w) => `/images/nfts/${artwork}-${w}.webp ${w}w`).join(', ')

function scrollToCatalog() {
  document.getElementById('mercado')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function Hero() {
  const [current, setCurrent] = useState(0)
  const slide = SLIDES[current]
  // Só uma das versões vai para o DOM: imagens escondidas com CSS também seriam baixadas
  const isDesktop = useIsDesktop()

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques" className="page-container">
      {isDesktop ? (
        <div className="flex items-center justify-between gap-10 py-8">
          <div className="max-w-[35rem] lg:pl-[3.75rem]">
            <p className="text-sm font-medium">Bem-vindo à Kurio</p>
            <h1 className="mt-3 text-3xl leading-[1.8] font-bold tracking-wide lg:text-[2.5rem]">
              SEJA DONO DO FUTURO DA ARTE DIGITAL
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte
              digital rara, apoie artistas e tenha uma parte da cultura da internet.
            </p>
            <button
              type="button"
              onClick={scrollToCatalog}
              className="mt-10 h-10 rounded-md bg-primary px-7 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              EXPLORAR
            </button>
            <SlideDots current={current} onSelect={setCurrent} className="mt-12 justify-end" />
          </div>
          <img
            src={`/images/nfts/${slide.artwork}-960.webp`}
            srcSet={srcSet(slide.artwork)}
            sizes="(min-width: 1024px) 450px, 40vw"
            width={960}
            height={960}
            alt={slide.alt}
            fetchPriority="high"
            className="aspect-square w-[min(40vw,28.125rem)] shrink-0 rounded-[1.25rem] object-cover"
          />
        </div>
      ) : (
        <div className="relative mt-4 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-band to-card p-4">
          <div
            aria-hidden
            className="absolute -top-16 left-1/3 size-56 rounded-full bg-primary/10"
          />
          <div className="relative flex gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">Bem-vindo à Kurio</p>
              <h1 className="mt-2 text-lg leading-snug font-bold tracking-wide">
                SEJA DONO DA CULTURA DIGITAL
              </h1>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Descubra NFTs selecionados de criadores do mundo todo.
              </p>
              <button
                type="button"
                onClick={scrollToCatalog}
                className="mt-1 inline-flex items-center gap-2 text-xs font-bold text-highlight"
              >
                EXPLORAR <ArrowRight className="size-4" aria-hidden />
              </button>
            </div>
            <div className="relative w-[8.5rem] shrink-0">
              <img
                src={`/images/nfts/${slide.artwork}-480.webp`}
                srcSet={srcSet(slide.artwork)}
                sizes="136px"
                width={480}
                height={480}
                alt={slide.alt}
                fetchPriority="high"
                className="aspect-square w-full rounded-2xl object-cover"
              />
              <img
                src={`/images/nfts/${SLIDES[(current + 1) % SLIDES.length].artwork}-240.webp`}
                width={240}
                height={240}
                alt=""
                className="absolute -bottom-2 -left-4 aspect-square w-16 rounded-xl border-2 border-card object-cover"
              />
            </div>
          </div>
          <SlideDots
            current={current}
            onSelect={setCurrent}
            className="relative mt-3 justify-center"
          />
        </div>
      )}
    </section>
  )
}

function SlideDots({
  current,
  onSelect,
  className,
}: {
  current: number
  onSelect: (index: number) => void
  className?: string
}) {
  return (
    <div className={cn('flex', className)}>
      {SLIDES.map((slide, index) => (
        <button
          key={slide.artwork}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`Mostrar destaque ${index + 1} de ${SLIDES.length}`}
          aria-current={index === current ? 'true' : undefined}
          // A área de toque tem 24 px (WCAG 2.2); o ponto desenhado continua com 8 px
          className="group grid size-6 place-items-center"
        >
          <span
            aria-hidden
            className={cn(
              'size-2 rounded-full bg-primary transition-opacity',
              index === current ? 'opacity-100' : 'opacity-50 group-hover:opacity-80',
            )}
          />
        </button>
      ))}
    </div>
  )
}
