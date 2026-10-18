import { mutationOptions, type QueryClient, queryOptions } from '@tanstack/react-query'
import type {
  CreateWalletRequest,
  Network,
  UpdateWalletRequest,
  Wallet,
  WalletConnection,
} from '@/api/contracts'
import {
  connectWallet,
  createWallet,
  disconnectWallet,
  listWallets,
  updateWallet,
} from '@/api/wallets'
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

/** Mantém a lista em cache com a carteira devolvida pela API, principal primeiro */
function upsertWallet(queryClient: QueryClient, userId: string, wallet: Wallet) {
  queryClient.setQueryData<Wallet[]>(queryKeys.user.wallets(userId), (list = []) =>
    [...list.filter((w) => w.id !== wallet.id), wallet].sort((a, b) =>
      a.role.localeCompare(b.role),
    ),
  )
}

export const createWalletMutationOptions = (queryClient: QueryClient, userId: string) =>
  mutationOptions<Wallet, Error, CreateWalletRequest>({
    mutationKey: ['wallets', 'create'],
    mutationFn: createWallet,
    onSuccess: (wallet) => upsertWallet(queryClient, userId, wallet),
  })

export const updateWalletMutationOptions = (queryClient: QueryClient, userId: string) =>
  mutationOptions<Wallet, Error, { walletId: string; changes: UpdateWalletRequest }>({
    mutationKey: ['wallets', 'update'],
    mutationFn: ({ walletId, changes }) => updateWallet(walletId, changes),
    onSuccess: (wallet) => upsertWallet(queryClient, userId, wallet),
  })
