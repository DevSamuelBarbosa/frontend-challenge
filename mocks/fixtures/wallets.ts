import type { Wallet } from '@/api/contracts'

export interface MockWallet extends Wallet {
  userId: string
}

export const wallets: MockWallet[] = [
  {
    id: 'wallet-ana-primary',
    userId: 'user-ana',
    role: 'primary',
    label: 'MetaMask pessoal',
    provider: 'metamask',
    address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    networks: ['ethereum', 'polygon'],
    createdAt: '2025-03-12T14:30:00.000Z',
    updatedAt: '2025-03-12T14:30:00.000Z',
  },
  {
    id: 'wallet-ana-secondary',
    userId: 'user-ana',
    role: 'secondary',
    label: 'Coinbase reserva',
    provider: 'coinbase',
    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    networks: ['ethereum'],
    createdAt: '2025-05-01T10:00:00.000Z',
    updatedAt: '2025-05-01T10:00:00.000Z',
  },
  {
    id: 'wallet-bruno-primary',
    userId: 'user-bruno',
    role: 'primary',
    label: 'WalletConnect',
    provider: 'walletconnect',
    address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    networks: ['ethereum', 'polygon'],
    createdAt: '2025-08-02T09:10:00.000Z',
    updatedAt: '2025-08-02T09:10:00.000Z',
  },
]
