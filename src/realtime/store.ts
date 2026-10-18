/**
 * Estado do canal em tempo real exposto à interface: situação da conexão e
 * avisos de alterações recebidas (ex.: preço de um item do carrinho mudou).
 */

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

export interface RealtimeNotice {
  /** Id do evento + edição: o mesmo aviso nunca aparece duas vezes */
  id: string
  kind: 'price_changed' | 'availability_changed'
  nftId: string
  editionId: string
  name: string
  editionName: string
  previous: string
  current: string
  at: string
}

type Listener = () => void

function createStore<T>(initial: T) {
  let value = initial
  const listeners = new Set<Listener>()
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return
      value = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export const realtimeStatus = createStore<RealtimeStatus>('idle')

const MAX_NOTICES = 20
const noticesStore = createStore<RealtimeNotice[]>([])

export const realtimeNotices = {
  get: noticesStore.get,
  subscribe: noticesStore.subscribe,
  push(notice: RealtimeNotice) {
    const current = noticesStore.get()
    if (current.some((n) => n.id === notice.id)) return
    noticesStore.set([...current, notice].slice(-MAX_NOTICES))
  },
  dismiss(id: string) {
    noticesStore.set(noticesStore.get().filter((n) => n.id !== id))
  },
  clear() {
    noticesStore.set([])
  },
}
