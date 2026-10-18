import { type LoginRequest, type RegisterRequest, type Session, sessionSchema } from './contracts'
import { api } from './client'
import { parseResponse } from './parse'

export async function login(body: LoginRequest): Promise<Session> {
  const { data } = await api.post('/auth/login', body)
  return parseResponse(sessionSchema, data)
}

export async function register(body: RegisterRequest): Promise<Session> {
  const { data } = await api.post('/auth/register', body)
  return parseResponse(sessionSchema, data)
}

export async function getSession(signal?: AbortSignal): Promise<Session> {
  const { data } = await api.get('/auth/session', { signal })
  return parseResponse(sessionSchema, data)
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}
