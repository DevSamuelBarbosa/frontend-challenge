import { QueryClient } from '@tanstack/react-query'

// Política inicial de cache. Os retries serão refinados junto com o tratamento de erros do Axios.
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 2,
        refetchOnWindowFocus: true,
      },
      mutations: {
        // Mutations nunca são repetidas automaticamente para não duplicar operações
        retry: false,
      },
    },
  })
}

export const queryClient = createQueryClient()
