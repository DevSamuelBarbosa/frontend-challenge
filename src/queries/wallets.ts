import { mutationOptions, type QueryClient, queryOptions } from '@tanstack/react-query'
import type { Network, WalletConnection } from '@/api/contracts'
import { connectWallet, disconnectWallet, listWallets } from '@/api/wallets'
import { queryKeys } from './keys'

export const walletsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.user.wallets(userId),
    queryFn: ({ signal }) => listWallets(signal),
  })

/** Conexão simulada da carteira, guardada no cache para a tela de pagamento */
export const connectWalletMutationOptions = (queryClient: QueryClient, userId: string) =>
  mutationOptions<WalletConnection, Error, { walletId: string; network: Network }>({
    mutationKey: ['wallets', 'connect'],
    mutationFn: ({ walletId, network }) => connectWallet(walletId, network),
    onSuccess: (connection) => {
      queryClient.setQueryData(queryKeys.user.walletConnection(userId), connection)
    },
  })

export const disconnectWalletMutationOptions = (queryClient: QueryClient, userId: string) =>
  mutationOptions<void, Error, { walletId: string }>({
    mutationKey: ['wallets', 'disconnect'],
    mutationFn: ({ walletId }) => disconnectWallet(walletId),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.user.walletConnection(userId), null)
    },
  })
