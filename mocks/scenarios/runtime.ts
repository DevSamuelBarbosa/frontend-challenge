import { db } from '../db'
import { DEFAULT_SCENARIO, findScenario, scenarios } from './definitions'
import type { Scenario, ScenarioRule, ScenarioTrigger } from './types'

const STORAGE_KEY = 'nft-marketplace:mock-scenario'

interface ScenarioState {
  name: string
  /** Quantas vezes cada regra ou gatilho já casou, para `times` e listas de atraso */
  counters: Record<string, number>
  /** Contador de requisições, semente do sorteio de latência */
  requests: number
}

function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function load(): ScenarioState {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as ScenarioState) : null
    if (parsed && findScenario(parsed.name)) return parsed
  } catch {
    // Valor inválido: volta para o padrão
  }
  return { name: DEFAULT_SCENARIO, counters: {}, requests: 0 }
}

let state = load()

function persist() {
  try {
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Segue só em memória
  }
}

export function activeScenario(): Scenario {
  return findScenario(state.name) ?? findScenario(DEFAULT_SCENARIO)!
}

/** Ativa o cenário. Por padrão restaura o banco, para o cenário partir de um estado conhecido. */
export function setScenario(name: string, options: { reset?: boolean } = {}) {
  const scenario = findScenario(name)
  if (!scenario) {
    throw new Error(
      `Cenário desconhecido: ${name}. Disponíveis: ${scenarios.map((s) => s.name).join(', ')}`,
    )
  }
  state = { name, counters: {}, requests: 0 }
  persist()
  if (options.reset ?? true) resetScenario()
}

/** Restaura o banco e reaplica os ajustes do cenário ativo */
export function resetScenario() {
  state = { ...state, counters: {}, requests: 0 }
  persist()
  db.reset()
  const { setup } = activeScenario()
  if (setup) db.update(setup)
}

function pathToRegExp(pattern: string) {
  const source = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:[A-Za-z]+/g, '[^/]+'))
    .join('.*')
  return new RegExp(`^${source}$`)
}

function matches(item: { method?: string; path: string }, method: string, path: string) {
  return (!item.method || item.method === method) && pathToRegExp(item.path).test(path)
}

/** Incrementa o contador e informa se o item ainda está dentro do limite `times` */
function consume(key: string, times?: number) {
  const count = state.counters[key] ?? 0
  if (times !== undefined && count >= times) return null
  state.counters[key] = count + 1
  persist()
  return count
}

export interface MatchedRule {
  rule: ScenarioRule
  /** Quantas vezes a regra já tinha casado antes desta requisição */
  count: number
}

/** Regras do cenário ativo que se aplicam à requisição, já contabilizadas */
export function matchRules(method: string, path: string, phase: 'before' | 'after') {
  const matched: MatchedRule[] = []
  activeScenario().rules?.forEach((rule, index) => {
    if ((rule.phase ?? 'before') !== phase || !matches(rule, method, path)) return
    const count = consume(`rule:${index}`, rule.times)
    if (count !== null) matched.push({ rule, count })
  })
  return matched
}

export function matchTriggers(method: string, path: string) {
  const matched: ScenarioTrigger[] = []
  activeScenario().triggers?.forEach((trigger, index) => {
    if (matches(trigger, method, path) && consume(`trigger:${index}`, trigger.times) !== null) {
      matched.push(trigger)
    }
  })
  return matched
}

/** Gerador pseudoaleatório com semente: a mesma sequência de requisições tem a mesma latência */
function seededRandom(seed: number) {
  let t = (seed + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function nextLatency() {
  const { latency } = activeScenario()
  state.requests += 1
  persist()
  if (typeof latency === 'number') return latency
  return Math.round(latency.min + seededRandom(state.requests) * (latency.max - latency.min))
}

export function scenarioInfo() {
  return {
    active: state.name,
    scenarios: scenarios.map(({ name, description }) => ({ name, description })),
  }
}
