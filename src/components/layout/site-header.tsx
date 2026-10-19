import { Link, useNavigate } from '@tanstack/react-router'
// LogOut desenha a seta saindo da porta, que é o ícone do botão "Entrar" no design
import { LogOut as EnterIcon, Search, ShoppingCart, UserRound, X } from 'lucide-react'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { UnavailableLink } from '@/components/unavailable'
import { useAuthDialog } from '@/features/auth/use-auth-dialog'
import { catalogSearchDefaults } from '@/features/catalog/search'
import { cn } from '@/lib/utils'
import { useSession } from '@/queries/session'
import { cartLabel, useCartCount, useMainSection } from './navigation'

const navItem =
  'relative flex h-full items-center text-base text-foreground transition-colors hover:text-highlight'
const activeItem =
  'font-bold text-highlight after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary'

/** Header do desktop e tablet. No mobile, a navegação fica na barra inferior. */
export function SiteHeader() {
  const section = useMainSection()

  return (
    <header className="hidden md:block">
      <div className="page-container flex h-[4.25rem] items-center justify-between border-b">
        <Link
          to="/"
          className="text-sm font-bold tracking-wider"
          aria-label="Kurio, página inicial"
        >
          KURIO
        </Link>

        <nav aria-label="Principal" className="h-full">
          <ul className="flex h-full gap-6 lg:gap-10">
            <li className="flex">
              <Link
                to="/"
                className={cn(navItem, section === 'home' && activeItem)}
                aria-current={section === 'home' ? 'page' : undefined}
              >
                Início
              </Link>
            </li>
            <li className="flex">
              <Link
                to="/"
                hash="mercado"
                className={cn(navItem, section === 'market' && activeItem)}
                aria-current={section === 'market' ? 'page' : undefined}
              >
                Mercado
              </Link>
            </li>
            <li className="flex">
              <UnavailableLink className={navItem}>Criadores</UnavailableLink>
            </li>
            <li className="flex">
              <UnavailableLink className={navItem}>Aprenda</UnavailableLink>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-5">
          <HeaderSearch />
          <CartLink />
          <AccountLink />
        </div>
      </div>
    </header>
  )
}

function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const navigate = useNavigate()

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function submit(event: FormEvent) {
    event.preventDefault()
    const q = term.trim() || undefined
    // A busca vale para o catálogo da tela inicial e reinicia a paginação
    void navigate({
      to: '/',
      search: (prev) => ({ ...prev, q, page: catalogSearchDefaults.page }),
      hash: 'mercado',
    })
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1 text-foreground hover:text-highlight"
        aria-label="Buscar NFTs"
      >
        <Search className="size-6" aria-hidden />
      </button>
    )
  }

  return (
    <form role="search" onSubmit={submit} className="flex items-center gap-1">
      <label htmlFor={inputId} className="sr-only">
        Buscar NFTs, criadores ou atributos
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="Buscar NFTs…"
        className="h-9 w-44 rounded-md border border-input bg-card px-3 text-sm placeholder:text-muted-foreground lg:w-56"
      />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md p-1 hover:text-highlight"
        aria-label="Fechar busca"
      >
        <X className="size-5" aria-hidden />
      </button>
    </form>
  )
}

function CartLink() {
  const count = useCartCount()
  return (
    <Link
      to="/cart"
      className="relative rounded-md p-1 hover:text-highlight"
      aria-label={cartLabel(count)}
    >
      <ShoppingCart className="size-6" aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-1 grid size-4 place-items-center rounded-full bg-primary text-[0.5625rem] font-bold text-primary-foreground"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

const accountButton =
  'inline-flex h-[2.125rem] items-center gap-1 rounded-md bg-primary px-2.5 text-base text-primary-foreground transition-colors hover:bg-primary/90'

function AccountLink() {
  const { user } = useSession()
  const openAuth = useAuthDialog()

  if (user) {
    return (
      <Link to="/profile" className={accountButton}>
        <UserRound className="size-5" aria-hidden />
        <span className="max-w-32 truncate">{user.username}</span>
        <span className="sr-only">, abrir perfil</span>
      </Link>
    )
  }
  return (
    // Abre o login sobre a tela atual, sem sair dela
    <button type="button" onClick={() => openAuth()} className={accountButton}>
      <EnterIcon className="size-5" aria-hidden />
      Entrar
    </button>
  )
}
