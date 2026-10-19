import type { Cart as CartContract } from '../src/api/contracts'
import { expect, test } from './support/app'
import { Cart } from './support/cart'
import { users } from './support/users'

test.describe('login em diálogo sobre a tela atual (desktop)', () => {
  test.beforeEach(({ app }) => {
    test.skip(app.isMobile, 'No celular o login é uma página própria')
  })

  test('"Entrar" no detalhe abre o diálogo sobre o NFT e, ao entrar, continua nele', async ({
    app,
    page,
  }) => {
    await app.open('/nfts/nft-001')
    const name = await page.locator('main h1').innerText()

    await page.getByRole('banner').getByRole('button', { name: 'Entrar' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // Não navegou: continua no detalhe, com o NFT atrás do diálogo
    await expect(page).toHaveURL('/nfts/nft-001')
    await expect(page.locator('main h1')).toHaveText(name)

    await dialog.getByPlaceholder('contato@email.com').fill(users.ana.email)
    await dialog.getByPlaceholder('Senha').fill(users.ana.password)
    await dialog
      .getByRole('form', { name: 'Entrar na conta' })
      .getByRole('button', { name: 'Entrar' })
      .click()

    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL('/nfts/nft-001')
    await expect(page.locator('main h1')).toHaveText(name)
    await expect(page.getByRole('banner').getByRole('link', { name: /ana_ribeiro/ })).toBeVisible()
  })

  test('fechar o diálogo (X ou Esc) mantém a tela atual', async ({ app, page }) => {
    await app.open('/nfts/nft-001')
    await page.getByRole('banner').getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page).toHaveURL('/nfts/nft-001')

    await page.getByRole('banner').getByRole('button', { name: 'Entrar' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page).toHaveURL('/nfts/nft-001')
  })

  test('alterna entre Entrar e Criar conta dentro do diálogo, sem trocar de rota', async ({
    app,
    page,
  }) => {
    await app.open('/nfts/nft-001')
    await page.getByRole('banner').getByRole('button', { name: 'Entrar' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Criar conta' }).click()
    await expect(dialog.getByRole('form', { name: 'Criar conta' })).toBeVisible()
    await expect(page).toHaveURL('/nfts/nft-001')

    await dialog.getByPlaceholder('Nome de usuário').fill('carla_dias')
    await dialog.getByPlaceholder('Digite seu e-mail').fill('carla@kurio.dev')
    await dialog.getByPlaceholder('Senha', { exact: true }).fill('Galeria2030')
    await dialog.getByPlaceholder('Confirmar senha').fill('Galeria2030')
    await dialog
      .getByRole('form', { name: 'Criar conta' })
      .getByRole('button', { name: 'Criar conta' })
      .click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL('/nfts/nft-001')
    await expect(page.getByRole('banner').getByRole('link', { name: /carla_dias/ })).toBeVisible()
  })

  test('"Conectar e finalizar" abre o login sobre o carrinho e leva ao pagamento com os itens', async ({
    app,
    page,
  }) => {
    await app.open('/')
    const cart = new Cart(app)
    const ape = await cart.editionPrice('nft-001', '1/50')
    await cart.addFromDetail('nft-001', { edition: '1/50', quantity: 2 })
    await cart.expectSubtotal(ape.price * 2)

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // O carrinho continua atrás do diálogo, com os itens
    await expect(page).toHaveURL('/cart')
    expect(await cart.quantity(ape.name)).toBe(2)

    await dialog.getByPlaceholder('contato@email.com').fill(users.ana.email)
    await dialog.getByPlaceholder('Senha').fill(users.ana.password)
    await dialog
      .getByRole('form', { name: 'Entrar na conta' })
      .getByRole('button', { name: 'Entrar' })
      .click()

    // Segue para o pagamento, com os itens do carrinho do visitante já na conta
    await expect(page).toHaveURL('/checkout', { timeout: 15_000 })
    await expect(page.getByRole('main').getByText(ape.name).first()).toBeVisible()
    await expect(page.getByText('Seu carrinho está vazio')).toHaveCount(0)
    const items = (await app.api<CartContract>('/cart')).items
    expect(items.map((item) => item.quantity)).toEqual([2])
  })

  test('favoritar como visitante abre o login sobre a página', async ({ app, page }) => {
    await app.open('/nfts/nft-001')
    await page
      .getByRole('main')
      .getByRole('button', { name: /^(Favoritar|Favoritado)$/ })
      .click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page).toHaveURL('/nfts/nft-001')
  })

  test('o acesso direto a /login continua funcionando como antes', async ({ app, page }) => {
    await app.open('/login')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('login no celular', () => {
  test('o botão do carrinho leva à página de login e depois ao pagamento', async ({
    app,
    page,
  }) => {
    test.skip(!app.isMobile, 'Só vale no celular')
    await app.open('/')
    const cart = new Cart(app)
    await cart.addFromDetail('nft-001', { edition: '1/50', quantity: 2 })

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
    const form = app.loginForm()
    await form.getByPlaceholder('contato@email.com').fill(users.ana.email)
    await form.getByPlaceholder('Senha').fill(users.ana.password)
    await form.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL('/checkout', { timeout: 15_000 })
    await expect(page.getByText('Seu carrinho está vazio')).toHaveCount(0)
  })
})
