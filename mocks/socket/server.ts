import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws, type WebSocketHandlerConnection } from 'msw'
import {
  type Nft,
  type NftUpdatedEvent,
  type OrderUpdatedEvent,
  REALTIME_EVENTS,
  type RealtimeEvent,
} from '@/api/contracts'
import { db, type MockOrder } from '../db'
import { toNftSummary } from '../lib/catalog'
import { onNftChanged } from '../lib/mutations'
import { onOrderChanged, toOrder } from '../lib/orders'
import { activeScenario } from '../scenarios/runtime'

/** Mesmo valor anunciado no handshake simulado pelo binding */
const PING_INTERVAL_MS = 25_000

interface Client {
  io: ReturnType<typeof toSocketIo>
  close: () => void
  sendRaw: (data: string) => void
  token: string | null
  userId: string | null
}

const clients = new Set<Client>()
/** Último evento enviado por recurso, usado para simular eventos antigos */
const lastEvents = new Map<string, RealtimeEvent>()

/**
 * O binding confirma a conexão do namespace sem olhar o `auth` do cliente.
 * Lemos o pacote CONNECT cru (`40{"token":"..."}`) para identificar a sessão.
 */
function readAuthToken(data: unknown) {
  if (typeof data !== 'string' || !data.startsWith('40')) return undefined
  try {
    const payload = JSON.parse(data.slice(2) || '{}') as { token?: unknown }
    return typeof payload.token === 'string' ? payload.token : null
  } catch {
    return null
  }
}

function sessionStatus(token: string) {
  const session = db.state.sessions.find((s) => s.token === token)
  if (!session) return { valid: false, reason: 'session_invalid' } as const
  if (Date.parse(session.expiresAt) <= Date.now()) {
    return { valid: false, reason: 'session_expired' } as const
  }
  return { valid: true, userId: session.userId } as const
}

/**
 * Encerra a conexão de uma sessão que deixou de valer. Além do evento semântico,
 * envia o pacote CONNECT_ERROR (`44`) do Socket.IO: o cliente emite `connect_error`
 * e não tenta reconectar sozinho, como faria com um middleware de autenticação.
 */
function rejectSession(client: Client, reason: 'session_invalid' | 'session_expired') {
  client.io.client.emit(REALTIME_EVENTS.sessionInvalid, { reason })
  client.sendRaw(`44${JSON.stringify({ message: reason })}`)
  // Fecha depois, para as mensagens acima chegarem antes do encerramento
  setTimeout(client.close, 50)
}

/**
 * Simula o servidor fora do ar: o navegador dispara `error` e depois `close`,
 * e é o `error` que faz o socket.io-client contar a tentativa e agendar outra.
 */
function refuseConnection(connection: WebSocketHandlerConnection) {
  const socket = (connection.client as { socket?: WebSocket }).socket
  socket?.dispatchEvent(new Event('error'))
  connection.client.close(1011, 'Servidor de tempo real indisponível')
}

function deliver(client: Client, event: RealtimeEvent) {
  const { realtime } = activeScenario()
  const previous = lastEvents.get(`${event.resource.type}:${event.resource.id}`)

  client.io.client.emit(event.type, event)
  if (realtime?.duplicate) client.io.client.emit(event.type, event)
  if (realtime?.stale && previous && previous.version < event.version) {
    client.io.client.emit(previous.type, previous)
  }
}

function remember(event: RealtimeEvent) {
  lastEvents.set(`${event.resource.type}:${event.resource.id}`, event)
}

export function toNftUpdatedEvent(nft: Nft): NftUpdatedEvent {
  const summary = toNftSummary(nft)
  return {
    id: `nft:${nft.id}:v${nft.version}`,
    type: REALTIME_EVENTS.nftUpdated,
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: {
      nftId: nft.id,
      priceEth: summary.priceEth,
      available: summary.available,
      editions: nft.editions.map(({ id, priceEth, available, maxPerOrder }) => ({
        id,
        priceEth,
        available,
        maxPerOrder,
      })),
    },
  }
}

export function toOrderUpdatedEvent(order: MockOrder): OrderUpdatedEvent {
  return {
    id: `order:${order.id}:v${order.version}`,
    type: REALTIME_EVENTS.orderUpdated,
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: new Date().toISOString(),
    data: toOrder(order),
  }
}

/** Evento público: vai para todas as conexões, autenticadas ou não */
export function broadcastNftUpdated(nft: Nft) {
  const event = toNftUpdatedEvent(nft)
  clients.forEach((client) => deliver(client, event))
  remember(event)
}

/** Evento privado: só para conexões com sessão válida do dono do pedido */
export function sendOrderUpdated(order: MockOrder) {
  const event = toOrderUpdatedEvent(order)
  clients.forEach((client) => {
    if (!client.token || client.userId !== order.userId) return
    const status = sessionStatus(client.token)
    if (!status.valid) return rejectSession(client, status.reason)
    deliver(client, event)
  })
  remember(event)
}

onNftChanged(broadcastNftUpdated)
onOrderChanged(sendOrderUpdated)

function handleConnection(connection: WebSocketHandlerConnection) {
  if (activeScenario().realtime?.offline) {
    refuseConnection(connection)
    return
  }

  const client: Client = {
    io: toSocketIo(connection),
    close: () => connection.client.close(),
    sendRaw: (data) => connection.client.send(data),
    token: null,
    userId: null,
  }
  clients.add(client)

  // O binding não envia pings: sem eles o cliente desconecta por "ping timeout"
  const ping = setInterval(() => connection.client.send('2'), PING_INTERVAL_MS)

  connection.client.addEventListener('message', (event) => {
    const token = readAuthToken(event.data)
    if (token === undefined) return
    client.token = token
    if (!token) return
    const status = sessionStatus(token)
    if (status.valid) client.userId = status.userId
    else rejectSession(client, status.reason)
  })

  connection.client.addEventListener('close', () => {
    clearInterval(ping)
    clients.delete(client)
  })
}

/**
 * O MSW remove o prefixo `/socket.io/` da URL antes de comparar com o handler,
 * então o link aponta para a origem da aplicação (com protocolo ws/wss).
 */
const socketOrigin =
  typeof location === 'undefined' ? 'ws://localhost' : location.origin.replace(/^http/, 'ws')
const socketLink = ws.link(`${socketOrigin}/`)

export const socketHandlers = [socketLink.addEventListener('connection', handleConnection)]

/** Controles do canal em tempo real para demonstração e testes */
export const realtimeControls = {
  /** Derruba todas as conexões. O cliente tenta reconectar sozinho. */
  dropConnections() {
    clients.forEach((client) => client.close())
  },
  connections() {
    return [...clients].map(({ userId }) => ({ userId }))
  },
  /** Reenvia o último evento de um recurso, como uma duplicata */
  replayLast(resourceType: 'nft' | 'order', id: string) {
    const event = lastEvents.get(`${resourceType}:${id}`)
    if (event) clients.forEach((client) => client.io.client.emit(event.type, event))
    return event ?? null
  },
  /** Envia um evento `nft.updated` com versão antiga, que o cliente deve ignorar */
  emitStaleNft(nftId: string) {
    const nft = db.state.nfts.find((n) => n.id === nftId)
    if (!nft) return null
    const stale = { ...toNftUpdatedEvent({ ...nft, version: Math.max(0, nft.version - 1) }) }
    clients.forEach((client) => client.io.client.emit(stale.type, stale))
    return stale
  },
}
