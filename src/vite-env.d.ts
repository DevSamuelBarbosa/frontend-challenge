/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API REST. Padrão: `/api` */
  readonly VITE_API_URL?: string
  /** `true` ativa a API simulada com MSW (desenvolvimento, demonstração e testes) */
  readonly VITE_ENABLE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
