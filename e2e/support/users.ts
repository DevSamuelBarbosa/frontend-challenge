/** Usuários das fixtures da API simulada (mocks/fixtures/users.ts) */
export const users = {
  ana: {
    id: 'user-ana',
    email: 'ana@nftmarket.dev',
    password: 'Colecao2026',
    name: 'Ana Ribeiro',
    username: 'ana_ribeiro',
  },
  bruno: {
    id: 'user-bruno',
    email: 'bruno@nftmarket.dev',
    password: 'Galeria2026',
    name: 'Bruno Carvalho',
    username: 'bruno_carvalho',
  },
} as const

export type TestUser = (typeof users)[keyof typeof users]
