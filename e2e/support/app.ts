import { expect, type Page, test as base } from '@playwright/test'
import type { MockControls } from '../../mocks/controls'
import type { ScenarioName } from '../../mocks/scenarios/definitions'
import type { TestUser } from './users'

type MocksWindow = Window & { __mocks: MockControls }

/**
 * Atalhos para abrir a aplicação num estado conhecido e acionar os controles da API
 * simulada (`window.__mocks`). Os controles mudam o mesmo banco dos handlers REST e
 * emitem os eventos pelo servidor Socket.IO simulado: a aplicação recebe tudo pelos
 * caminhos reais (Axios e socket.io-client).
 */
export class App {
  constructor(readonly page: Page) {}

  /** Abre a rota com o banco restaurado e o cenário ativo, e espera a API simulada */
  async open(path = '/', { scenario = 'default' }: { scenario?: ScenarioName } = {}) {
    const url = new URL(path, 'http://app')
    url.searchParams.set('scenario', scenario)
    await this.page.goto(`${url.pathname}${url.search}${url.hash}`)
    await this.ready()
  }

  /** Navega sem restaurar o banco (ex.: depois do login, ou para conferir persistência) */
  async goto(path: string) {
    await this.page.goto(path)
    await this.ready()
  }

  async ready() {
    await this.page.waitForFunction(() => '__mocks' in window)
  }

  /** Executa uma função com os controles da API simulada, dentro da página */
  mocks<R, A = undefined>(fn: (mocks: MockControls, arg: A) => R | Promise<R>, arg?: A) {
    return this.page.evaluate(
      async ([source, value]) => {
        const run = new Function(`return (${source})`)() as (
          mocks: MockControls,
          arg: unknown,
        ) => unknown
        return run((window as unknown as MocksWindow).__mocks, value)
      },
      [fn.toString(), arg] as const,
    ) as Promise<Awaited<R>>
  }

  /**
   * Consulta a API simulada de dentro da página (passa pelos handlers do MSW). Serve de
   * referência para conferir se a interface mostra o que a API devolve.
   */
  api<T>(path: string, { method = 'GET', body }: { method?: string; body?: unknown } = {}) {
    return this.page.evaluate(
      async ({ url, method, body }) => {
        // Mesma identificação da aplicação: o token da sessão, se houver
        const token = localStorage.getItem('nft-marketplace:session-token')
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        })
        return response.status === 204 ? null : response.json()
      },
      { url: `/api${path}`, method, body },
    ) as Promise<T>
  }

  /**
   * Espera a conexão em tempo real (Socket.IO) estar aberta no servidor simulado. Com
   * `userId`, espera a conexão autenticada desse usuário (eventos privados de pedido).
   */
  async waitRealtime(userId?: string) {
    await expect
      .poll(() =>
        this.mocks(
          (mocks, id) => mocks.realtime.connections().some((c) => (id ? c.userId === id : true)),
          userId,
        ),
      )
      .toBe(true)
  }

  /** Registra as requisições REST que casam com o padrão, para provar que não houve refetch */
  recordRequests(pattern: RegExp) {
    const seen: string[] = []
    this.page.on('request', (request) => {
      const url = new URL(request.url())
      if (request.method() === 'GET' && pattern.test(url.pathname)) seen.push(url.pathname)
    })
    return seen
  }

  /** Projeto mobile (barra inferior, filtros na gaveta) ou desktop */
  get isMobile() {
    return (this.page.viewportSize()?.width ?? 1440) < 768
  }

  /** Entra pela tela de login, como o usuário faria, e espera voltar ao destino */
  async login(
    user: TestUser,
    { scenario = 'default', redirect }: { scenario?: ScenarioName; redirect?: string } = {},
  ) {
    await this.open(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login', {
      scenario,
    })
    const form = this.page.getByRole('form', { name: 'Entrar na conta' })
    await form.getByPlaceholder('contato@email.com').fill(user.email)
    await form.getByPlaceholder('Senha').fill(user.password)
    await form.getByRole('button', { name: 'Entrar' }).click()
    await expect(this.page).toHaveURL(redirect ?? '/')
  }

  /** Sai pelo menu da conta, como o usuário faria */
  async logout() {
    await this.goto('/profile')
    await this.page
      .getByRole('navigation', { name: 'Minha conta' })
      .getByRole('button', { name: 'Sair' })
      .click()
    await expect(this.page).toHaveURL('/')
  }

  /** Formulário de login, no modal (desktop) ou na página (celular) */
  loginForm() {
    return this.page.getByRole('form', { name: 'Entrar na conta' })
  }

  registerForm() {
    return this.page.getByRole('form', { name: 'Criar conta' })
  }
}

export const test = base.extend<{ app: App }>({
  app: async ({ page }, use) => {
    await use(new App(page))
  },
})

export { expect }
