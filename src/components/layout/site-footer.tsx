import { Link } from '@tanstack/react-router'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import type { NftCategory } from '@/api/contracts'
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
  YoutubeIcon,
} from '@/components/icons/social-icons'
import { UnavailableButton, UnavailableLink } from '@/components/unavailable'
import { CATEGORIES_ALPHABETICAL, CATEGORY_LABELS } from '@/features/catalog/labels'
import { cn } from '@/lib/utils'
import { useHasBuyBar, useIsAuthRoute } from './navigation'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const FOOTER_CATEGORIES: NftCategory[] = [
  'digital_art',
  'photography',
  'music',
  'art_3d',
  'utility',
]
const COLLECTION_LINKS = CATEGORIES_ALPHABETICAL.filter((category) =>
  FOOTER_CATEGORIES.includes(category),
).map((category) => ({ label: CATEGORY_LABELS[category], category }))

const SOCIAL: { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { label: 'Facebook', Icon: FacebookIcon },
  { label: 'Instagram', Icon: InstagramIcon },
  { label: 'Twitter', Icon: TwitterIcon },
  { label: 'LinkedIn', Icon: LinkedinIcon },
  { label: 'YouTube', Icon: YoutubeIcon },
]

const linkClass = 'text-sm text-foreground transition-colors hover:text-highlight'

export function SiteFooter() {
  const hasBuyBar = useHasBuyBar()
  const isAuthRoute = useIsAuthRoute()
  return (
    <footer
      className={cn(
        'page-container mt-20 md:mt-28 md:pb-0',
        hasBuyBar ? 'pb-60' : 'pb-28',
        isAuthRoute && 'max-md:hidden',
      )}
    >
      <div className="bg-card">
        <section
          aria-label="Benefícios da Kurio"
          className="grid gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:px-12"
        >
          {FEATURES.map((feature) => (
            <div
              key={feature.letter}
              className="lg:border-r lg:border-primary lg:pr-6 lg:pl-6 lg:first:pl-0"
            >
              <span
                aria-hidden
                className="grid size-[4.625rem] place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground"
              >
                {feature.letter}
              </span>
              <h2 className="mt-3 text-base font-bold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-[1.6] text-muted-foreground">{feature.text}</p>
            </div>
          ))}
          <Newsletter />
        </section>

        <div className="grid gap-3 bg-band px-6 py-6 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:items-center lg:px-8 lg:py-7">
          <p className="font-bold tracking-wider">KURIO</p>
          <p className="leading-relaxed">Feito para colecionadores, criadores e cultura</p>
          <a href="mailto:contato@email.com" className={linkClass}>
            contato@email.com
          </a>
          <a href="tel:+551140028922" className={linkClass}>
            +55 11 4002 8922
          </a>
        </div>

        <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <FooterColumn title="Meu perfil">
            <Link to="/profile" className={linkClass}>
              Meu perfil
            </Link>
            <UnavailableLink className={linkClass}>Minha coleção</UnavailableLink>
            <UnavailableLink className={linkClass}>Atividade</UnavailableLink>
            <UnavailableLink className={linkClass}>Estúdio do criador</UnavailableLink>
            <Link to="/favorites" className={linkClass}>
              Lista de interesse
            </Link>
          </FooterColumn>

          <FooterColumn title="Central de ajuda">
            {[
              'Central de ajuda',
              'Como comprar NFTs',
              'Carteira e segurança',
              'Política do mercado',
              'Denunciar item',
            ].map((label) => (
              <UnavailableLink key={label} className={linkClass}>
                {label}
              </UnavailableLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Coleções">
            {COLLECTION_LINKS.map(({ label, category }) => (
              <Link
                key={category}
                to="/"
                search={{ category: [category] }}
                hash="mercado"
                className={linkClass}
              >
                {label}
              </Link>
            ))}
          </FooterColumn>

          <div>
            <h2 className="text-lg font-bold">Redes sociais</h2>
            <ul className="mt-4 flex gap-2">
              {SOCIAL.map(({ label, Icon }) => (
                <li key={label}>
                  <UnavailableButton
                    label={label}
                    className="grid size-8 place-items-center rounded-md border border-primary text-primary"
                  >
                    <Icon />
                  </UnavailableButton>
                </li>
              ))}
            </ul>
            <h2 className="mt-8 text-lg font-bold">Carteiras compatíveis</h2>
            <p className="mt-3 inline-block rounded-md border border-input bg-band px-2.5 py-1.5 text-[0.5625rem] font-bold tracking-wide text-primary">
              METAMASK · WALLETCONNECT · COINBASE
            </p>
          </div>
        </div>
      </div>

      <p className="py-5 text-center text-sm">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {(Array.isArray(children) ? children : [children]).map((child, index) => (
          <li key={index}>{child}</li>
        ))}
      </ul>
    </div>
  )
}

function Newsletter() {
  return (
    <div className="lg:pl-4">
      <h2 className="text-base leading-tight font-bold">Antecipe-se ao próximo lançamento</h2>
      <form className="mt-4 flex" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="newsletter-email" className="sr-only">
          E-mail para receber novidades
        </label>
        <input
          id="newsletter-email"
          type="email"
          disabled
          placeholder="digite seu e-mail..."
          className="h-10 min-w-0 flex-1 rounded-l-md bg-band px-3 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <UnavailableButton className="h-10 rounded-r-md bg-primary px-4 text-lg font-bold text-primary-foreground">
          Enviar
        </UnavailableButton>
      </form>
      <p className="mt-4 text-sm leading-[1.6] text-muted-foreground">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </div>
  )
}
