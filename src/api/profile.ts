import {
  type ChangePasswordRequest,
  type Profile,
  profileSchema,
  type UpdateProfileRequest,
} from './contracts'
import { api } from './client'
import { parseResponse } from './parse'

export async function getProfile(signal?: AbortSignal): Promise<Profile> {
  const { data } = await api.get('/profile', { signal })
  return parseResponse(profileSchema, data)
}

export async function updateProfile(body: UpdateProfileRequest): Promise<Profile> {
  const { data } = await api.patch('/profile', body)
  return parseResponse(profileSchema, data)
}

export async function uploadAvatar(file: File): Promise<Profile> {
  const form = new FormData()
  form.append('file', file)
  // Sem Content-Type fixo: o navegador define o multipart com o boundary
  const { data } = await api.put('/profile/avatar', form, {
    headers: { 'Content-Type': undefined },
  })
  return parseResponse(profileSchema, data)
}

export async function removeAvatar(): Promise<Profile> {
  const { data } = await api.delete('/profile/avatar')
  return parseResponse(profileSchema, data)
}

export async function changePassword(body: ChangePasswordRequest): Promise<void> {
  await api.put('/profile/password', body)
}
