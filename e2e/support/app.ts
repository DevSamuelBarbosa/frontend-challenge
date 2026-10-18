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
  api<T>(path: string) {
    return this.page.evaluate(async (url) => {
      const response = await fetch(url)
      return response.json()
    }, `/api${path}`) as Promise<T>
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
}

export const test = base.extend<{ app: App }>({
  app: async ({ page }, use) => {
    await use(new App(page))
  },
})

export { expect }
