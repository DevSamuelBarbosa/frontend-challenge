import { type Nft, type NftList, type NftListParams, nftListSchema, nftSchema } from './contracts'
import { api } from './client'
import { parseResponse } from './parse'

export async function listNfts(params: NftListParams, signal?: AbortSignal): Promise<NftList> {
  const { data } = await api.get('/nfts', {
    params,
    signal,
    // Arrays como `category=music&category=games` (o padrão do Axios seria `category[]=`)
    paramsSerializer: { indexes: null },
  })
  return parseResponse(nftListSchema, data)
}

export async function getNft(nftId: string, signal?: AbortSignal): Promise<Nft> {
  const { data } = await api.get(`/nfts/${encodeURIComponent(nftId)}`, { signal })
  return parseResponse(nftSchema, data)
}
