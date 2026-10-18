import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/errors'

const MAX_QUERY_RETRIES = 2

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Só repete falhas transitórias (5xx, rede, timeout). Erros 4xx são definitivos.
        retry: (failureCount, error) =>
          isApiError(error) && error.isRetryable && failureCount < MAX_QUERY_RETRIES,
      },
      mutations: {
        // Mutations nunca são repetidas automaticamente para não duplicar operações
        retry: false,
      },
    },
  })
}

export const queryClient = createQueryClient()
