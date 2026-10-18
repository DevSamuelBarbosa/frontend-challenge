import { type Profile, profileSchema } from './contracts'
import { api } from './client'
import { parseResponse } from './parse'

export async function getProfile(signal?: AbortSignal): Promise<Profile> {
  const { data } = await api.get('/profile', { signal })
  return parseResponse(profileSchema, data)
}
