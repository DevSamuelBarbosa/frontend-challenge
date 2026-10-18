import { z } from 'zod'
import {
  type Network,
  type Wallet,
  type WalletConnection,
  walletConnectionSchema,
  walletSchema,
} from './contracts'
import { api } from './client'
import { parseResponse } from './parse'

export async function listWallets(signal?: AbortSignal): Promise<Wallet[]> {
  const { data } = await api.get('/wallets', { signal })
  return parseResponse(z.array(walletSchema), data)
}

export async function connectWallet(walletId: string, network: Network): Promise<WalletConnection> {
  const { data } = await api.post(`/wallets/${encodeURIComponent(walletId)}/connection`, {
    network,
  })
  return parseResponse(walletConnectionSchema, data)
}

export async function disconnectWallet(walletId: string): Promise<void> {
  await api.delete(`/wallets/${encodeURIComponent(walletId)}/connection`)
}
