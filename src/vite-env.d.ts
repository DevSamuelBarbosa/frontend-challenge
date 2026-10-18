/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API REST. Padrão: `/api` */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
