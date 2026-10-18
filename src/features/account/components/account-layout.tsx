import { Link, useNavigate } from '@tanstack/react-router'
import {
  ChartNoAxesCombined,
  CircleAlert,
  Download,
  Heart,
  LogOut,
  MapPin,
  ShoppingCart,
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { UnavailableLink } from '@/components/unavailable'
import { cn } from '@/lib/utils'
import { useLogout } from '@/queries/session'

type Section = 'profile' | 'wallets' | 'favorites'

const iconClass = 'size-5 shrink-0'
const itemClass =
  'flex items-center gap-3 border-l-[6px] border-transparent px-3 py-3 text-base text-primary transition-colors hover:text-highlight md:py-[0.6875rem] max-md:gap-2 max-md:border-b-2 max-md:border-l-0 max-md:whitespace-nowrap'

const LINKS = [
  { section: 'profile', to: '/profile', label: 'Dados do perfil', icon: UserRound },
  { section: 'wallets', to: '/wallets', label: 'Carteiras', icon: MapPin },
] as const

const UNAVAILABLE = [{ label: 'Atividade', icon: ShoppingCart }] as const

const UNAVAILABLE_AFTER = [
  { label: 'Ofertas', icon: ChartNoAxesCombined },
  { label: 'Arquivos baixados', icon: Download },
  { label: 'Suporte', icon: CircleAlert },
] as const

/**
 * Área da conta: menu lateral no desktop (como no design) e, no celular, o mesmo menu
 * no topo da tela. Os itens fora do escopo aparecem desabilitados.
 */
export function AccountLayout({ section, children }: { section: Section; children: ReactNode }) {
  const navigate = useNavigate()
  const logout = useLogout()

  const signOut = () =>
    logout.mutate(undefined, { onSuccess: () => void navigate({ to: '/', replace: true }) })

  const link = (active: boolean) =>
    cn(itemClass, active && 'border-primary bg-card/60 font-bold text-highlight')

  return (
    <div className="page-container grid grid-cols-[minmax(0,1fr)] gap-6 pt-6 pb-8 md:grid-cols-[17.5rem_1fr] md:gap-7 md:pt-8 lg:grid-cols-[18.75rem_1fr]">
      <nav aria-label="Minha conta" className="min-w-0 self-start bg-card">
        <p className="px-3 pt-3 pb-1 text-lg font-bold md:px-[0.625rem]">Meu perfil</p>
        <ul className="relative max-md:flex max-md:overflow-x-auto">
          {LINKS.map(({ section: id, to, label, icon: Icon }) => (
            <li key={id}>
              <Link
                to={to}
                aria-current={section === id ? 'page' : undefined}
                className={link(section === id)}
              >
                <Icon className={iconClass} aria-hidden />
                {label}
              </Link>
            </li>
          ))}
          {UNAVAILABLE.map(({ label, icon: Icon }) => (
            <li key={label}>
              <UnavailableLink className={cn(itemClass, 'cursor-not-allowed')}>
                <Icon className={iconClass} aria-hidden />
                {label}
              </UnavailableLink>
            </li>
          ))}
          <li>
            <Link
              to="/favorites"
              aria-current={section === 'favorites' ? 'page' : undefined}
              className={link(section === 'favorites')}
            >
              <Heart className={iconClass} aria-hidden />
              Lista de interesse
            </Link>
          </li>
          {UNAVAILABLE_AFTER.map(({ label, icon: Icon }) => (
            <li key={label}>
              <UnavailableLink className={cn(itemClass, 'cursor-not-allowed')}>
                <Icon className={iconClass} aria-hidden />
                {label}
              </UnavailableLink>
            </li>
          ))}
          <li className="md:border-divider md:border-t">
            <button
              type="button"
              disabled={logout.isPending}
              onClick={signOut}
              className={cn(itemClass, 'w-full font-bold disabled:opacity-60')}
            >
              <LogOut className={iconClass} aria-hidden />
              Sair
            </button>
          </li>
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
