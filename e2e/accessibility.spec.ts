import type { Page } from '@playwright/test'
import { expect, test } from './support/app'
import { Catalog } from './support/catalog'
import { Checkout } from './support/checkout'
import { users } from './support/users'

/** Elemento com foco agora, descrito por papel e nome acessível */
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return el
      ? `${el.tagName.toLowerCase()}:${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40)}`
      : null
  })

const insideDialog = (page: Page) =>
  page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))

test.describe('teclado, foco e formulários', () => {
  test('o primeiro Tab leva ao link de pular conteúdo, que move o foco para o conteúdo', async ({
    app,
    page,
  }) => {
    await app.open('/')
    await page.waitForLoadState('networkidle')
    // Parte do início da página, como quem acabou de chegar
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()

    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()
  })

  test('filtros e abas do catálogo funcionam só com o teclado', async ({ app, page }) => {
    test.skip(app.isMobile, 'No celular os filtros ficam na gaveta (testada à parte)')
    await app.open('/')
    const catalog = new Catalog(app)
    await catalog.names()

    const music = catalog.section
      .getByRole('group', { name: 'Coleções' })
      .getByRole('button', { name: /Música/ })
    await music.focus()
    await page.keyboard.press('Enter')
    await expect(music).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Space')
    await expect(music).toHaveAttribute('aria-pressed', 'false')

    const trending = catalog.section.getByRole('group', { name: 'Mostrar' }).getByRole('button', {
      name: 'Em alta',
    })
    await trending.focus()
    await page.keyboard.press('Enter')
    await expect(trending).toHaveAttribute('aria-pressed', 'true')
  })

  test('a gaveta de filtros do celular prende o foco, fecha com Esc e devolve o foco', async ({
    app,
    page,
  }) => {
    test.skip(!app.isMobile, 'A gaveta só existe no celular')
    await app.open('/')
    const trigger = page.getByRole('button', { name: 'Filtros e ordenação' })
    await trigger.click()
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await expect(sheet).toBeVisible()
    expect(await insideDialog(page)).toBe(true)

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await insideDialog(page)).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('o seletor de edição muda com as setas do teclado', async ({ app, page }) => {
    await app.open('/nfts/nft-001')
    const editions = page.getByRole('main').getByRole('radio')
    const checked = () => page.getByRole('main').getByRole('radio', { checked: true })

    await checked().focus()
    const before = await checked().getAttribute('value')
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => checked().getAttribute('value')).not.toBe(before)
    expect(await editions.count()).toBeGreaterThan(1)
  })

  test('diálogo de revisão: foco dentro, Tab preso, Esc fecha e o foco volta ao botão', async ({
    app,
    page,
  }) => {
    await app.login(users.ana)
    const checkout = new Checkout(app)
    await checkout.seedCart([{ nftId: 'nft-001', editionId: 'nft-001-ed50', quantity: 1 }])
    await checkout.open()
    await checkout.fillRequired()

    await checkout.review()
    expect(await insideDialog(page)).toBe(true)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      expect(await insideDialog(page)).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(checkout.dialog()).toBeHidden()
    await expect(checkout.confirmButton()).toBeFocused()
  })

  test('login em modal (desktop): foco dentro, Esc volta ao início', async ({ app, page }) => {
    test.skip(app.isMobile, 'No celular o login é uma página, sem diálogo')
    await app.open('/login')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await insideDialog(page)).toBe(true)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      expect(await insideDialog(page)).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL('/')
  })

  test('envio com Enter, foco no primeiro campo inválido e erros ligados ao campo', async ({
    app,
    page,
  }) => {
    await app.open('/register')
    const form = app.registerForm()
    await form.getByPlaceholder('Nome de usuário').focus()
    await page.keyboard.press('Enter')

    const username = form.getByPlaceholder('Nome de usuário')
    await expect(username).toBeFocused()
    await expect(username).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await username.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText(/Use de 3 a 20 caracteres/)

    // Corrigir o campo remove o erro enquanto digita
    await username.fill('carla_dias')
    await expect(username).not.toHaveAttribute('aria-invalid', 'true')
  })

  test('o pagamento não abre a revisão com campos inválidos e foca o primeiro', async ({ app }) => {
    await app.login(users.ana)
    const checkout = new Checkout(app)
    await checkout.seedCart([{ nftId: 'nft-001', editionId: 'nft-001-ed50', quantity: 1 }])
    await checkout.open()

    await checkout.confirmButton().click()
    await expect(checkout.dialog()).toHaveCount(0)
    const referral = checkout.form().getByLabel('Código de indicação')
    await expect(referral).toBeFocused()
    await expect(referral).toHaveAttribute('aria-invalid', 'true')
    expect(await focused(app.page)).toContain('input')
  })
})
