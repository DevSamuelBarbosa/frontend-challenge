import type { FavoriteList } from '../src/api/contracts'
import { expect, test } from './support/app'
import { users } from './support/users'

test.describe('cadastro, login, sessão e troca de usuário', () => {
  test('cadastro valida os campos, recusa e-mail já usado e entra na conta nova', async ({
    app,
    page,
  }) => {
    await app.open('/register')
    const form = app.registerForm()

    await form.getByRole('button', { name: /Criar (conta|perfil)/ }).click()
    await expect(form.getByRole('alert')).toHaveCount(4)
    await expect(form.getByPlaceholder('Nome de usuário')).toBeFocused()

    await form.getByPlaceholder('Nome de usuário').fill('carla_dias')
    await form.getByPlaceholder('Digite seu e-mail').fill(users.ana.email)
    await form.getByPlaceholder('Senha', { exact: true }).fill('Galeria2030')
    await form.getByPlaceholder('Confirmar senha').fill('Galeria2031')
    await form.getByRole('button', { name: /Criar (conta|perfil)/ }).click()
    await expect(form.getByText('As senhas não coincidem')).toBeVisible()

    await form.getByPlaceholder('Confirmar senha').fill('Galeria2030')
    await form.getByRole('button', { name: /Criar (conta|perfil)/ }).click()
    await expect(form.getByText('Já existe uma conta com este e-mail')).toBeVisible()
    await expect(form.getByPlaceholder('Digite seu e-mail')).toBeFocused()

    await form.getByPlaceholder('Digite seu e-mail').fill('carla@kurio.dev')
    await form.getByRole('button', { name: /Criar (conta|perfil)/ }).click()
    await expect(page).toHaveURL('/')

    // A conta nova está ativa: a área privada abre com os dados dela
    await app.goto('/profile')
    await expect(page.getByLabel('Nome de usuário')).toHaveValue('carla_dias')
  })

  test('login recusa credenciais erradas e volta ao destino pedido', async ({ app, page }) => {
    await app.open('/favorites')
    await expect(page).toHaveURL(/\/login\?redirect=%2Ffavorites/)

    const form = app.loginForm()
    await form.getByPlaceholder('contato@email.com').fill(users.ana.email)
    await form.getByPlaceholder('Senha').fill('senha-errada1')
    await form.getByRole('button', { name: 'Entrar' }).click()
    await expect(form.getByRole('alert')).toHaveText('E-mail ou senha incorretos')
    await expect(form.getByPlaceholder('contato@email.com')).toHaveValue(users.ana.email)

    await form.getByPlaceholder('Senha').fill(users.ana.password)
    await form.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL('/favorites')
    await expect(page.getByRole('heading', { name: 'Lista de interesse' })).toBeVisible()
  })

  test('sessão expirada leva ao login e retoma a tela depois', async ({ app, page }) => {
    // Relógio controlado: a sessão deste cenário dura 30 s
    await page.clock.install()
    await app.login(users.ana, { scenario: 'session-expiring', redirect: '/profile' })
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(users.ana.name)

    await page.clock.fastForward('00:31')

    await expect(page).toHaveURL(/\/login\?/)
    const url = new URL(page.url())
    expect(url.searchParams.get('redirect')).toBe('/profile')
    expect(url.searchParams.get('reason')).toBe('session_expired')
    await expect(page.getByRole('status')).toContainText('Sua sessão expirou')

    const form = app.loginForm()
    await form.getByPlaceholder('contato@email.com').fill(users.ana.email)
    await form.getByPlaceholder('Senha').fill(users.ana.password)
    await form.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL('/profile')
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(users.ana.name)
  })

  test('sessão encerrada pela API (401) no meio do uso leva ao login', async ({ app, page }) => {
    await app.login(users.ana, { redirect: '/wallets' })
    await expect(page.getByRole('form', { name: 'Carteira principal' })).toBeVisible()

    await app.mocks((mocks) => mocks.expireSessions())
    await app.page
      .getByRole('navigation', { name: 'Minha conta' })
      .getByRole('link', { name: 'Lista de interesse' })
      .click()

    await expect(page).toHaveURL(/\/login\?/)
    await expect(page.getByRole('status')).toContainText('sessão')
  })

  test('logout encerra a sessão e bloqueia as rotas privadas', async ({ app, page }) => {
    await app.login(users.ana)
    await app.logout()

    for (const path of ['/profile', '/wallets', '/favorites', '/checkout']) {
      await app.goto(path)
      await expect(page).toHaveURL(new RegExp(`/login\\?redirect=${encodeURIComponent(path)}`))
    }
  })

  test('trocar de usuário não mostra dados da conta anterior', async ({ app, page }) => {
    await app.login(users.ana, { redirect: '/favorites' })
    const anaFavorites = await app.api<FavoriteList>('/favorites')
    expect(anaFavorites.items.length).toBeGreaterThan(0)
    await expect(page.getByRole('main').getByRole('article')).toHaveCount(anaFavorites.items.length)

    await app.logout()
    const form = app.loginForm()
    await app.goto('/login?redirect=%2Ffavorites')
    await form.getByPlaceholder('contato@email.com').fill(users.bruno.email)
    await form.getByPlaceholder('Senha').fill(users.bruno.password)
    await form.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL('/favorites')
    await expect(page.getByText('Você ainda não favoritou nenhum NFT')).toBeVisible()
    await expect(page.getByRole('main').getByRole('article')).toHaveCount(0)

    await app.goto('/profile')
    await expect(
      page.getByRole('form', { name: 'Dados do perfil' }).getByLabel('E-mail'),
    ).toHaveValue(users.bruno.email)
  })
})
