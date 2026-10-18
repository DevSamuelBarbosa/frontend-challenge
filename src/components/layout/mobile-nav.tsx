import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, House, ScanLine, ShoppingCart, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { UnavailableButton } from '@/components/unavailable'
import { cn } from '@/lib/utils'
import { useSession } from '@/queries/session'
import { cartLabel, useCartCount, useHasBuyBar } from './navigation'

/** Barra de navegação inferior do mobile, com o recorte para o botão central */
export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const count = useCartCount()
  const { user } = useSession()
  const hasBuyBar = useHasBuyBar()
  if (hasBuyBar) return null

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 h-[5.75rem] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="absolute inset-0 rounded-t-[2.5rem] bg-card mobile-nav-bar" />
      <ul className="relative grid h-full grid-cols-5 items-center px-4">
        <NavItem to="/" label="Início" active={pathname === '/'}>
          <House className="size-[1.375rem]" aria-hidden fill="currentColor" />
        </NavItem>
        <NavItem to="/favorites" label="Favoritos" active={pathname === '/favorites'}>
          <Heart className="size-[1.375rem]" aria-hidden fill="currentColor" />
        </NavItem>
        <li className="relative flex h-full justify-center">
          <UnavailableButton
            label="Escanear NFT"
            className="absolute top-0 left-1/2 grid size-16 -translate-x-1/2 -translate-y-[42%] place-items-center rounded-full bg-gradient-to-br from-primary/90 to-[#a8683a]/90 text-foreground !opacity-100 backdrop-blur-sm"
          >
            <ScanLine className="size-7" aria-hidden />
          </UnavailableButton>
        </li>
        <NavItem to="/cart" label={cartLabel(count)} active={pathname === '/cart'}>
          <span className="relative">
            <ShoppingCart className="size-[1.375rem]" aria-hidden fill="currentColor" />
            {count > 0 && (
              <span
                aria-hidden
                className="absolute -top-1.5 -right-2 grid size-4 place-items-center rounded-full bg-primary text-[0.5625rem] font-bold text-primary-foreground"
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </span>
        </NavItem>
        <NavItem
          to={user ? '/profile' : '/login'}
          label={user ? 'Perfil' : 'Entrar'}
          active={pathname === '/profile' || pathname === '/login'}
        >
          <UserRound className="size-[1.375rem]" aria-hidden fill="currentColor" />
        </NavItem>
      </ul>
    </nav>
  )
}

function NavItem({
  to,
  label,
  active,
  children,
}: {
  to: '/' | '/favorites' | '/cart' | '/profile' | '/login'
  label: string
  active: boolean
  children: ReactNode
}) {
  return (
    <li className="flex justify-center">
      <Link
        to={to}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'grid size-11 place-items-center rounded-full transition-colors',
          active ? 'text-highlight' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {children}
      </Link>
    </li>
  )
}
