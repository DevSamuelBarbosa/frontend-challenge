import { ZoomIn } from 'lucide-react'
import { useState } from 'react'
import type { Image } from '@/api/contracts'
import { NftImage } from '@/components/nft-image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/**
 * Galeria do NFT: miniaturas, imagem principal e zoom em diálogo (que prende o
 * foco e fecha com Esc). No celular só aparece a imagem principal, sangrando até as bordas.
 */
export function NftGallery({ name, images }: { name: string; images: Image[] }) {
  const [current, setCurrent] = useState(0)
  const image = images[current] ?? images[0]

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[6.25rem_minmax(0,1fr)] lg:gap-6">
      <ul
        aria-label={`Imagens de ${name}`}
        className="order-2 hidden grid-cols-4 gap-3 md:grid lg:order-1 lg:flex lg:flex-col"
      >
        {images.map((thumb, index) => (
          <li key={thumb.url + index} className="min-w-0 lg:w-[6.25rem]">
            <button
              type="button"
              onClick={() => setCurrent(index)}
              aria-pressed={index === current}
              aria-label={`Ver imagem ${index + 1} de ${images.length}`}
              className={cn(
                'block overflow-hidden rounded-md border-2 border-transparent transition-colors hover:border-primary/60',
                index === current && 'border-primary',
              )}
            >
              <NftImage image={thumb} sizes="100px" decorative className="size-full" />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative order-1 md:rounded-none md:bg-card md:p-5 lg:order-2">
        <NftImage
          image={image}
          sizes="(min-width: 1024px) 405px, (min-width: 768px) 45vw, 100vw"
          priority
          className="w-full rounded-[1.25rem] md:rounded-2xl"
        />
        <Dialog>
          <DialogTrigger
            className="absolute top-6 right-6 grid size-9 place-items-center rounded-full bg-background/80 text-foreground transition-colors hover:text-highlight max-md:hidden"
            aria-label="Ampliar imagem"
          >
            <ZoomIn className="size-5" aria-hidden />
          </DialogTrigger>
          <DialogContent className="max-w-[min(90vw,52rem)] gap-3 border-0 bg-card p-3 sm:max-w-[min(90vw,52rem)]">
            <DialogTitle className="sr-only">{name}</DialogTitle>
            <DialogDescription className="sr-only">{image.alt}</DialogDescription>
            <NftImage
              image={image}
              sizes="(min-width: 832px) 800px, 90vw"
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
