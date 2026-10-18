import type { QueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { SOCKET_PATH } from '@/api/config'
import {
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  REALTIME_EVENTS,
  sessionInvalidEventSchema,
} from '@/api/contracts'
import { queryKeys } from '@/queries/keys'
import { applyNftUpdated, applyOrderUpdated, reconcileAfterReconnect } from './handlers'
import { realtimeNotices, realtimeStatus } from './store'

const MAX_SEEN_EVENTS = 500

interface ConnectionOptions {
  queryClient: QueryClient
  /** Sessão da conexão. Sem sessão, só recebe eventos públicos. */
  token: string | null
  userId: string | null
}

/**
 * Uma conexão por sessão. Ao trocar de sessão (login, logout, troca de usuário),
 * a conexão anterior é encerrada com todos os seus listeners, então eventos de
 * uma sessão nunca alcançam os dados de outra.
 */
export function openRealtimeConnection({ queryClient, token, userId }: ConnectionOptions) {
  const socket: Socket = io({
    path: SOCKET_PATH,
    // O mock (MSW + socket.io-binding) só simula o transporte WebSocket
    transports: ['websocket'],
    auth: token ? { token } : {},
  })

  let closed = false
  let connectedBefore = false
  // Ids já processados: duplicatas não reaplicam efeitos (ex.: avisos)
  const seen = new Set<string>()
  const firstTime = (id: string) => {
    if (seen.has(id)) return false
    seen.add(id)
    if (seen.size > MAX_SEEN_EVENTS) seen.delete(seen.values().next().value!)
    return true
  }

  realtimeStatus.set('connecting')

  socket.on('connect', () => {
    realtimeStatus.set('connected')
    if (connectedBefore) reconcileAfterReconnect(queryClient)
    connectedBefore = true
  })

  socket.on('disconnect', () => {
    if (!closed) realtimeStatus.set('reconnecting')
  })

  socket.io.on('reconnect_attempt', () => realtimeStatus.set('reconnecting'))

  socket.on('connect_error', (error) => {
    // Sessão recusada pelo servidor: revalida a sessão (o 401 encerra e redireciona)
    if (error.message === 'session_expired' || error.message === 'session_invalid') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.session })
      return
    }
    realtimeStatus.set(socket.active ? 'reconnecting' : 'offline')
  })

  socket.on(REALTIME_EVENTS.nftUpdated, (payload: unknown) => {
    const event = nftUpdatedEventSchema.safeParse(payload)
    if (!event.success || closed || !firstTime(event.data.id)) return
    applyNftUpdated(queryClient, event.data)
  })

  socket.on(REALTIME_EVENTS.orderUpdated, (payload: unknown) => {
    const event = orderUpdatedEventSchema.safeParse(payload)
    // Evento privado: só vale para a sessão desta conexão
    if (!event.success || closed || !userId || !firstTime(event.data.id)) return
    applyOrderUpdated(queryClient, userId, event.data)
  })

  socket.on(REALTIME_EVENTS.sessionInvalid, (payload: unknown) => {
    if (closed || !sessionInvalidEventSchema.safeParse(payload).success) return
    void queryClient.invalidateQueries({ queryKey: queryKeys.session })
  })

  return function close() {
    closed = true
    socket.removeAllListeners()
    socket.io.removeAllListeners()
    socket.disconnect()
    realtimeStatus.set('idle')
    // Avisos pertencem à sessão que está sendo encerrada
    realtimeNotices.clear()
  }
}
