import { type Quote, type QuoteRequest, quoteSchema } from './contracts'
import { api } from './client'
import { parseResponse } from './parse'

export async function createQuote(body: QuoteRequest, signal?: AbortSignal): Promise<Quote> {
  const { data } = await api.post('/quote', body, { signal })
  return parseResponse(quoteSchema, data)
}
