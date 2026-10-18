import type { Profile } from '@/api/contracts'

/** Usuário como fica guardado no "banco" simulado. A senha nunca é armazenada em claro. */
export interface MockUser extends Profile {
  /** PBKDF2-SHA256, 100.000 iterações, 32 bytes, em hexadecimal */
  passwordHash: string
  passwordSalt: string
}

/*
 * Credenciais fictícias para demonstração e testes:
 *   ana@nftmarket.dev   / Colecao2026
 *   bruno@nftmarket.dev / Galeria2026
 */
export const users: MockUser[] = [
  {
    id: 'user-ana',
    name: 'Ana Ribeiro',
    username: 'ana_ribeiro',
    email: 'ana@nftmarket.dev',
    bio: 'Coleciono arte generativa e fotografia digital desde 2021.',
    avatarUrl: '/images/avatars/user-ana.svg',
    createdAt: '2025-03-12T14:20:00.000Z',
    updatedAt: '2025-03-12T14:20:00.000Z',
    passwordSalt: 'salt-ana-7f3a91',
    passwordHash: '33c79096e5df5b8d25429df6e677ff3552fb24008d6f7cbf10652467578ff6f2',
  },
  {
    id: 'user-bruno',
    name: 'Bruno Carvalho',
    username: 'bruno_carvalho',
    email: 'bruno@nftmarket.dev',
    bio: '',
    avatarUrl: null,
    createdAt: '2025-08-02T09:05:00.000Z',
    updatedAt: '2025-08-02T09:05:00.000Z',
    passwordSalt: 'salt-bruno-c41e08',
    passwordHash: 'fae4bbb42d6b2350eb81082a769537e8aae28e4f8fd9b4a7be657e5bbd71bade',
  },
]
