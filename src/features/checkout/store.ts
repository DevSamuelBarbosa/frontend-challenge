import type { Collector, CreateOrderRequest, Network } from '@/api/contracts'

/** Dados preenchidos no pagamento. Sobrevivem a refresh e à expiração da sessão. */
export interface CheckoutDraft {
  network: Network
  walletId: string | null
  couponCode: string | null
  /** "Usar outra carteira?": os NFTs vão para a carteira ou ENS informado em `collector.secondaryWallet` */
  deliverToOther: boolean
  collector: Collector
}

/**
 * Tentativa de pedido. É gravada antes do envio: se a resposta se perder
 * (timeout, queda, refresh), o reenvio usa a mesma chave e o mesmo corpo, e o
 * servidor devolve o pedido já criado em vez de criar outro.
 */
export interface OrderAttempt {
  idempotencyKey: string
  body: CreateOrderRequest
  orderId: string | null
}

export interface CheckoutState {
  draft: CheckoutDraft
  /** Resumo dos valores que o usuário revisou e aceitou */
  acceptedQuote: string | null
  attempt: OrderAttempt | null
}

export const emptyCheckoutState = (): CheckoutState => ({
  draft: {
    network: 'ethereum',
    walletId: null,
    couponCode: null,
    deliverToOther: false,
    collector: {
      displayName: '',
      username: '',
      profileName: '',
      email: '',
      referralCode: '',
      ensName: '',
      secondaryWallet: '',
      note: '',
    },
  },
  acceptedQuote: null,
  attempt: null,
})

// A versão descarta rascunhos salvos em formatos antigos
const storageKey = (userId: string) => `nft-marketplace:checkout:v2:${userId}`

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

type Listener = () => void

function createStore(userId: string) {
  const listeners = new Set<Listener>()
  const notify = () => listeners.forEach((listener) => listener())

  function load(): CheckoutState {
    try {
      const raw = storage()?.getItem(storageKey(userId))
      if (raw) {
        const saved = JSON.parse(raw) as Partial<CheckoutState>
        const empty = emptyCheckoutState()
        // Mescla campo a campo: rascunhos antigos sem algum campo novo continuam válidos
        return {
          ...empty,
          ...saved,
          draft: {
            ...empty.draft,
            ...saved.draft,
            collector: { ...empty.draft.collector, ...saved.draft?.collector },
          },
        }
      }
    } catch {
      // Estado inválido: começa do zero
    }
    return emptyCheckoutState()
  }

  let state = load()

  return {
    get: () => state,
    update(change: (current: CheckoutState) => CheckoutState) {
      state = change(state)
      try {
        storage()?.setItem(storageKey(userId), JSON.stringify(state))
      } catch {
        // Sem armazenamento: o checkout vale só nesta aba
      }
      notify()
    },
    clear() {
      state = emptyCheckoutState()
      try {
        storage()?.removeItem(storageKey(userId))
      } catch {
        // Ignorado
      }
      notify()
    },
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export type CheckoutStore = ReturnType<typeof createStore>

const stores = new Map<string, CheckoutStore>()

/** Estado do checkout isolado por usuário */
export function checkoutStore(userId: string): CheckoutStore {
  let store = stores.get(userId)
  if (!store) {
    store = createStore(userId)
    stores.set(userId, store)
  }
  return store
}
