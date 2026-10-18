import { HttpResponse } from 'msw'
import { z } from 'zod'
import type { ApiErrorBody, ApiErrorCode, FieldErrors } from '@/api/errors'

const STATUS_BY_CODE: Partial<Record<ApiErrorCode, number>> = {
  validation_error: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  server_error: 500,
}

/** Resposta de erro no formato do contrato `ApiErrorBody` */
export function errorResponse(
  code: ApiErrorCode,
  message: string,
  extra: { status?: number; fields?: FieldErrors; details?: Record<string, unknown> } = {},
) {
  const body: ApiErrorBody = {
    error: { code, message, fields: extra.fields, details: extra.details },
  }
  return HttpResponse.json(body, { status: extra.status ?? STATUS_BY_CODE[code] ?? 500 })
}

/**
 * Valida o corpo da requisição com o schema do contrato. Em caso de erro,
 * lança uma resposta 400 com a primeira mensagem de cada campo.
 */
export async function parseBody<T extends z.ZodType>(request: Request, schema: T) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    throw errorResponse('validation_error', 'Corpo da requisição inválido')
  }

  const result = schema.safeParse(json)
  if (result.success) return result.data as z.infer<T>

  const fields: FieldErrors = {}
  for (const issue of result.error.issues) {
    const path = issue.path.join('.')
    if (path && !fields[path]) fields[path] = issue.message
  }
  throw errorResponse('validation_error', 'Verifique os campos informados', { fields })
}
