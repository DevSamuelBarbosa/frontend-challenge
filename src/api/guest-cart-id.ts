/**
 * Id anônimo do carrinho do visitante. É criado só no primeiro "adicionar" e
 * descartado depois que o carrinho é juntado ao da conta.
 */

const STORAGE_KEY = 'nft-marketplace:guest-cart-id'

type Listener = () => void
const listeners = new Set<Listener>()

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

let current: string | null = storage()?.getItem(STORAGE_KEY) ?? null

function write(next: string | null) {
  current = next
  try {
    if (next) storage()?.setItem(STORAGE_KEY, next)
    else storage()?.removeItem(STORAGE_KEY)
  } catch {
    // Sem armazenamento: o carrinho do visitante vale só nesta aba
  }
  listeners.forEach((listener) => listener())
}

export const guestCartId = {
  get: () => current,

  /** Retorna o id atual ou cria um novo */
  ensure() {
    if (!current) write(crypto.randomUUID())
    return current!
  },

  clear: () => write(null),

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    current = event.newValue
    listeners.forEach((listener) => listener())
  })
}
