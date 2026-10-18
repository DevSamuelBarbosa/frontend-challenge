import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: RootLayout,
})

// Navegação provisória, será substituída pelo header do Figma
const links = [
  { to: '/', label: 'Início' },
  { to: '/cart', label: 'Carrinho' },
  { to: '/checkout', label: 'Pagamento' },
  { to: '/login', label: 'Login' },
  { to: '/register', label: 'Cadastro' },
  { to: '/profile', label: 'Perfil' },
  { to: '/wallets', label: 'Carteiras' },
] as const

function RootLayout() {
  return (
    <>
      <header className="border-b">
        <nav aria-label="Principal" className="flex flex-wrap gap-4 p-4">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="[&.active]:font-bold"
              activeOptions={{ exact: link.to === '/' }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  )
}
