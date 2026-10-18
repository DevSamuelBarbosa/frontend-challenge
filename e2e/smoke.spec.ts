import { expect, test } from './support/app'
import { users } from './support/users'

test.describe('base dos testes', () => {
  test('abre a tela inicial com o catálogo vindo da API simulada', async ({ app, page }) => {
    await app.open('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('#mercado article').first()).toBeVisible()
  })

  test('o login de um teste não vaza para o seguinte', async ({ app, page }) => {
    await app.login(users.ana)
    await app.goto('/favorites')
    await expect(page.getByRole('heading', { name: 'Lista de interesse' })).toBeVisible()
  })

  test('cada teste começa sem sessão e com o cenário padrão', async ({ app, page }) => {
    await app.open('/')
    expect(await app.mocks((mocks) => mocks.scenarios().active)).toBe('default')
    await app.goto('/favorites')
    await expect(page).toHaveURL(/\/login\?redirect=%2Ffavorites/)
  })
})
