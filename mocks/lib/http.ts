import { delay, http, HttpResponse } from 'msw'
import { REQUEST_TIMEOUT_MS } from '@/api/config'
import { db } from '../db'
import { matchRules, matchTriggers, nextLatency, type MatchedRule } from '../scenarios/runtime'
import { runTrigger } from '../scenarios/triggers'
import { apiPath, apiUrl } from '../utils'
import { errorResponse } from './responses'
import { getBearerToken } from './session'

type Resolver = Parameters<typeof http.get>[1]
type ResolverInfo = Parameters<Resolver>[0]

/** Aplica o efeito de uma regra. Retorna a resposta que substitui a original, se houver. */
async function applyEffect({ rule, count }: MatchedRule) {
  const { effect } = rule
  switch (effect.type) {
    case 'delay': {
      const list = Array.isArray(effect.ms) ? effect.ms : [effect.ms]
      await delay(list[count % list.length])
      return null
    }
    case 'timeout':
      // Segura a resposta além do limite do cliente, que já terá desistido
      await delay(REQUEST_TIMEOUT_MS + 2000)
      return HttpResponse.error()
    case 'network_error':
      return HttpResponse.error()
    case 'error':
      return errorResponse(effect.code, effect.message, {
        status: effect.status,
        details: effect.details,
      })
  }
}

async function applyRules(rules: MatchedRule[]) {
  for (const rule of rules) {
    const response = await applyEffect(rule)
    if (response) return response
  }
  return null
}

function scheduleTriggers(request: Request, method: string, path: string) {
  const token = getBearerToken(request)
  const userId = db.state.sessions.find((s) => s.token === token)?.userId
  if (!userId) return
  for (const trigger of matchTriggers(method, path)) {
    setTimeout(() => runTrigger(trigger.action, userId), trigger.delayMs)
  }
}

/** Envolve o handler com latência, falhas e gatilhos do cenário ativo */
function withScenario(resolver: Resolver): Resolver {
  return async (info: ResolverInfo) => {
    const { request } = info
    const method = request.method
    const path = apiPath(request.url)

    await delay(nextLatency())
    const before = await applyRules(matchRules(method, path, 'before'))
    if (before) return before

    let response: Response | undefined
    try {
      response = (await resolver(info)) as Response | undefined
    } catch (error) {
      // Os handlers lançam respostas de erro (ex.: 401 de requireSession)
      if (error instanceof Response) response = error
      else throw error
    }

    const after = await applyRules(matchRules(method, path, 'after'))
    if (after) return after

    if (response && response.status < 400) scheduleTriggers(request, method, path)
    return response
  }
}

/** Registro de handlers da API com o pipeline de cenários aplicado */
export const api = {
  get: (path: string, resolver: Resolver) => http.get(apiUrl(path), withScenario(resolver)),
  post: (path: string, resolver: Resolver) => http.post(apiUrl(path), withScenario(resolver)),
  put: (path: string, resolver: Resolver) => http.put(apiUrl(path), withScenario(resolver)),
  patch: (path: string, resolver: Resolver) => http.patch(apiUrl(path), withScenario(resolver)),
  delete: (path: string, resolver: Resolver) => http.delete(apiUrl(path), withScenario(resolver)),
}
