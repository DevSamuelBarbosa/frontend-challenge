import type { NftListParams } from '@/api/contracts'

/**
 * Chaves do TanStack Query. Dados privados ficam sob `['user', userId, ...]`:
 * isolam o cache por usuário e permitem limpar tudo de uma vez no logout.
 */
export const queryKeys = {
  session: ['session'] as const,

  nfts: {
    all: ['nfts'] as const,
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    detail: (nftId: string) => ['nfts', 'detail', nftId] as const,
  },

  user: {
    all: ['user'] as const,
    scope: (userId: string) => ['user', userId] as const,
    favorites: (userId: string) => ['user', userId, 'favorites'] as const,
    cart: (userId: string) => ['user', userId, 'cart'] as const,
    quote: (userId: string) => ['user', userId, 'quote'] as const,
    orders: (userId: string) => ['user', userId, 'orders'] as const,
    order: (userId: string, orderId: string) => ['user', userId, 'orders', orderId] as const,
    profile: (userId: string) => ['user', userId, 'profile'] as const,
    wallets: (userId: string) => ['user', userId, 'wallets'] as const,
  },
}
