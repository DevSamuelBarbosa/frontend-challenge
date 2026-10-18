import type { Image } from '@/api/contracts'
import { cn } from '@/lib/utils'

interface NftImageProps {
  image: Image
  /** Largura exibida, para o navegador escolher a variante certa do `srcset` */
  sizes: string
  className?: string
  /** Imagem principal da tela (LCP): carrega antes e sem `lazy` */
  priority?: boolean
  /** Texto alternativo vazio quando a imagem é decorativa (o nome já está ao lado) */
  decorative?: boolean
}

/**
 * Imagem de NFT com `srcset`. Largura e altura vêm do contrato, então o espaço é
 * reservado antes do carregamento e o layout não se desloca.
 */
export function NftImage({ image, sizes, className, priority, decorative }: NftImageProps) {
  const srcSet = image.variants.map((v) => `${v.url} ${v.width}w`).join(', ')
  return (
    <img
      src={image.url}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      width={image.width}
      height={image.height}
      alt={decorative ? '' : image.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={cn('aspect-square object-cover', className)}
    />
  )
}
