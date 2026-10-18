import { createRouter } from '@tanstack/react-router'
import { NotFound } from '@/components/not-found'
import { queryClient } from '@/lib/query-client'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Quem controla o cache dos dados é o TanStack Query, não o router
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultNotFoundComponent: NotFound,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
