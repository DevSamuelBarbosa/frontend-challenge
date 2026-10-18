import { isAxiosError, isCancel } from 'axios'

/**
 * Categorias de erro que a interface sabe tratar. As que vêm do servidor
 * correspondem ao campo `error.code` do corpo da resposta.
 */
export type ApiErrorCode =
  | 'validation_error' // 400/422: campos inválidos
  | 'unauthorized' // 401: sessão ausente, inválida ou expirada
  | 'forbidden' // 403: sem permissão para o recurso
  | 'not_found' // 404: recurso inexistente
  | 'conflict' // 409: conflito (cadastro duplicado, disponibilidade, idempotência)
  | 'server_error' // 5xx: falha transitória do servidor
  | 'timeout' // requisição excedeu o tempo limite
  | 'network_error' // sem conexão ou servidor inacessível
  | 'cancelled' // requisição cancelada pelo cliente (ex.: resposta obsoleta)
  | 'unknown'

/** Erros por campo, no formato `{ campo: mensagem }` */
export type FieldErrors = Record<string, string>

/** Formato do corpo de erro retornado pela API */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    fields?: FieldErrors
    details?: Record<string, unknown>
  }
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null
  readonly fields: FieldErrors
  readonly details: Record<string, unknown>

  constructor(params: {
    code: ApiErrorCode
    message: string
    status?: number | null
    fields?: FieldErrors
    details?: Record<string, unknown>
    cause?: unknown
  }) {
    super(params.message, { cause: params.cause })
    this.name = 'ApiError'
    this.code = params.code
    this.status = params.status ?? null
    this.fields = params.fields ?? {}
    this.details = params.details ?? {}
  }

  /** Falhas transitórias que podem ser repetidas com segurança em consultas */
  get isRetryable() {
    return this.code === 'server_error' || this.code === 'network_error' || this.code === 'timeout'
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function codeFromStatus(status: number): ApiErrorCode {
  if (status === 400 || status === 422) return 'validation_error'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status >= 500) return 'server_error'
  return 'unknown'
}

function isApiErrorBody(data: unknown): data is ApiErrorBody {
  if (typeof data !== 'object' || data === null || !('error' in data)) return false
  const { error } = data as { error: unknown }
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error
}

/** Converte qualquer erro do Axios em um `ApiError` tipado */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error

  if (isCancel(error)) {
    return new ApiError({ code: 'cancelled', message: 'Requisição cancelada', cause: error })
  }

  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({
        code: 'timeout',
        message: 'O servidor demorou para responder. Tente novamente.',
        cause: error,
      })
    }

    const { response } = error
    if (!response) {
      return new ApiError({
        code: 'network_error',
        message: 'Não foi possível conectar. Verifique sua conexão.',
        cause: error,
      })
    }

    if (isApiErrorBody(response.data)) {
      const body = response.data.error
      return new ApiError({
        code: body.code,
        message: body.message,
        status: response.status,
        fields: body.fields,
        details: body.details,
        cause: error,
      })
    }

    return new ApiError({
      code: codeFromStatus(response.status),
      message: 'Ocorreu um erro inesperado. Tente novamente.',
      status: response.status,
      cause: error,
    })
  }

  return new ApiError({
    code: 'unknown',
    message: 'Ocorreu um erro inesperado. Tente novamente.',
    cause: error,
  })
}
