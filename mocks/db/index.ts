import { createSeedState, SCHEMA_VERSION } from './seed'
import type { MockState } from './types'

export type * from './types'

const STORAGE_KEY = 'nft-marketplace:mock-db'

/** localStorage pode não existir (Node) ou estar bloqueado (modo privado) */
function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function load(): MockState {
  const raw = getStorage()?.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as MockState
      if (parsed.schemaVersion === SCHEMA_VERSION) return parsed
    } catch {
      // Estado corrompido: volta para o seed
    }
  }
  return createSeedState()
}

function persist(state: MockState) {
  try {
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Sem espaço ou sem permissão: segue só em memória
  }
}

let state = load()

export const db = {
  /** Leitura do estado atual. Use `update` para qualquer alteração. */
  get state(): Readonly<MockState> {
    return state
  },

  /** Aplica uma alteração e persiste o resultado */
  update<T>(mutate: (draft: MockState) => T): T {
    const result = mutate(state)
    persist(state)
    return result
  },

  /** Gera ids sequenciais e determinísticos, ex.: `order-0001` */
  nextId(prefix: string) {
    return db.update((draft) => {
      draft.sequence += 1
      return `${prefix}-${String(draft.sequence).padStart(4, '0')}`
    })
  },

  /** Restaura integralmente o cenário inicial */
  reset() {
    state = createSeedState()
    persist(state)
  },

  /** Recarrega do armazenamento, útil quando outra aba alterou os dados */
  reload() {
    state = load()
  },
}
