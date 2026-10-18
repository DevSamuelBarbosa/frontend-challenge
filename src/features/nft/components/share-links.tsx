import { Mail } from 'lucide-react'
import { LinkedinIcon, TwitterIcon } from '@/components/icons/social-icons'

/** Compartilhamento por links reais: abrem o compartilhamento da rede ou o e-mail com o endereço do NFT */
export function ShareLinks({ name, url }: { name: string; url: string }) {
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(`${name} na Kurio`)
  const link = 'rounded-md p-1 transition-colors hover:text-highlight'
  return (
    <p className="flex items-center gap-2 font-bold">
      <span id="share-label">Compartilhar este NFT:</span>
      <a
        className={link}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartilhar no LinkedIn (abre em nova aba)"
      >
        <LinkedinIcon className="size-5" />
      </a>
      <a
        className={link}
        href={`mailto:?subject=${encodedText}&body=${encodedUrl}`}
        aria-label="Compartilhar por e-mail"
      >
        <Mail className="size-5" aria-hidden />
      </a>
      <a
        className={link}
        href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartilhar no Twitter (abre em nova aba)"
      >
        <TwitterIcon className="size-5" />
      </a>
    </p>
  )
}
