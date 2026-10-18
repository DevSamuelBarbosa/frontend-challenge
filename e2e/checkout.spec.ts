import { expect, test } from './support/app'
import { Cart } from './support/cart'
import { Catalog } from './support/catalog'
import { Checkout } from './support/checkout'
import { users } from './support/users'

const ITEMS = [
  { nftId: 'nft-001', editionId: 'nft-001-ed50', quantity: 2 },
  { nftId: 'nft-003', editionId: 'nft-003-ed50', quantity: 1 },
]

test.describe('compra completa', () => {
  test('do catálogo ao recibo confirmado', async ({ app, page }) => {
    await app.login(users.ana)
    const catalog = new Catalog(app)
    const cart = new Cart(app)
    const checkout = new Checkout(app)

    // Catálogo -> detalhe
    const [first] = await catalog.names()
    await catalog
      .cards()
      .filter({ hasText: first })
      .getByRole('link', { name: first, exact: true })
      .click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(first)
    const nftId = new URL(page.url()).pathname.split('/').pop()!

    // Detalhe -> carrinho (edição aberta, 2 unidades)
    await cart.addFromDetail(nftId, { edition: 'ABERTA', quantity: 2 })
    expect(await cart.quantity(first)).toBe(2)
    const total = await cart.value('Total')

    // Carrinho -> pagamento
    await page.getByRole('link', { name: 'Finalizar compra' }).click()
    await expect(page).toHaveURL('/checkout')
    await expect(checkout.form().getByLabel('Nome de exibição')).toHaveValue(users.ana.name)
    await checkout.fillRequired()

    // Revisão com o mesmo total do carrinho
    await checkout.review()
    await expect(checkout.dialog()).toContainText(first)
    const reviewTotal = (await checkout.dialog().innerText()).match(/Total\s+([\d.]+) ETH/)?.[1]
    expect(Number(reviewTotal)).toBeCloseTo(total, 6)

    // Envio -> pagamento pendente -> recibo
    await checkout.sendButton().click()
    await expect(
      checkout.dialog().getByRole('heading', { name: /Enviando pedido|Pagamento pendente/ }),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/orders\/order-/, { timeout: 15_000 })
    await expect(checkout.receiptHeading()).toBeVisible()
    await expect(page.getByRole('main')).toContainText(first)

    const orders = await checkout.orders()
    expect(orders).toHaveLength(1)
    expect(orders[0].status).toBe('confirmed')
    expect(Number(orders[0].totalEth)).toBeCloseTo(total, 6)
    expect(await checkout.cartQuantities()).toEqual([])

    // O recibo é uma página própria: sobrevive ao refresh e leva de volta ao início
    await page.reload()
    await app.ready()
    await expect(checkout.receiptHeading()).toBeVisible()
    await page.getByRole('link', { name: 'Voltar para a tela inicial' }).click()
    await expect(page).toHaveURL('/')
  })
})

test.describe('falhas no pagamento', () => {
  test('pagamento recusado mantém o carrinho e a nova tentativa confirma', async ({
    app,
    page,
  }) => {
    await app.login(users.ana, { scenario: 'payment-rejected' })
    const checkout = new Checkout(app)
    await checkout.seedCart(ITEMS)
    await checkout.open()
    await checkout.fillRequired()
    await checkout.review()
    await checkout.sendButton().click()

    await expect(
      checkout.dialog().getByRole('heading', { name: 'Pagamento recusado' }),
    ).toBeVisible({
      timeout: 15_000,
    })
    await expect(checkout.dialog().getByRole('alert')).toBeVisible()
    expect(await checkout.cartQuantities()).toEqual([2, 1])
    await expect(page).toHaveURL('/checkout')

    await checkout.dialog().getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(checkout.dialog()).toBeHidden()
    await expect(checkout.form().getByLabel('Código de indicação')).toHaveValue('KURIO2026')

    await app.mocks((mocks) => mocks.setScenario('default', { reset: false }))
    await checkout.review()
    await checkout.sendButton().click()
    await expect(page).toHaveURL(/\/orders\/order-/, { timeout: 15_000 })
    await expect(checkout.receiptHeading()).toBeVisible()
    expect((await checkout.orders()).map((o) => o.status).sort()).toEqual(['confirmed', 'rejected'])
  })

  test('cliques repetidos criam um único pedido', async ({ app, page }) => {
    await app.login(users.ana)
    const checkout = new Checkout(app)
    await checkout.seedCart(ITEMS)
    await checkout.open()
    await checkout.fillRequired()

    // Três cliques seguidos em "Confirmar compra" abrem uma única revisão
    await checkout.confirmButton().click({ clickCount: 3 })
    await expect(checkout.dialog()).toHaveCount(1)
    await expect(checkout.sendButton()).toBeEnabled()

    // Três cliques em "Confirmar e enviar": um pedido só
    await checkout.sendButton().click({ clickCount: 3 })
    // Durante o envio a revisão não fecha com Esc
    await page.keyboard.press('Escape')
    await expect(checkout.dialog()).toBeVisible()

    await expect(page).toHaveURL(/\/orders\/order-/, { timeout: 15_000 })
    expect(await checkout.orders()).toHaveLength(1)
  })

  test('timeout na criação do pedido: o reenvio usa a mesma chave e recupera o pedido', async ({
    app,
    page,
  }) => {
    // Relógio controlado: o limite de 10 s do cliente passa sem esperar de verdade
    await page.clock.install()
    await app.login(users.ana, { scenario: 'order-timeout' })
    const checkout = new Checkout(app)
    await checkout.seedCart(ITEMS)
    await checkout.open()
    await checkout.fillRequired()
    await checkout.review()

    const keys: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/orders')) {
        keys.push(request.headers()['idempotency-key'])
      }
    })
    await checkout.sendButton().click()

    // O servidor cria o pedido, mas a resposta não chega antes do limite do cliente
    await expect.poll(async () => (await checkout.orders()).length).toBe(1)
    await page.clock.fastForward('00:11')

    // O cliente reenvia sozinho, com a mesma chave, e recebe o pedido já criado
    await expect(page).toHaveURL(/\/orders\/order-/, { timeout: 15_000 })
    expect(keys.length).toBeGreaterThanOrEqual(2)
    expect(new Set(keys).size).toBe(1)
    const orders = await checkout.orders()
    expect(orders).toHaveLength(1)
    expect(new URL(page.url()).pathname).toBe(`/orders/${orders[0].id}`)
  })

  test('timeout seguido de refresh retoma o mesmo pedido', async ({ app, page }) => {
    await page.clock.install()
    await app.login(users.ana, { scenario: 'order-timeout' })
    const checkout = new Checkout(app)
    await checkout.seedCart(ITEMS)
    await checkout.open()
    await checkout.fillRequired()
    await checkout.review()
    await checkout.sendButton().click()
    await expect.poll(async () => (await checkout.orders()).length).toBe(1)

    // O usuário recarrega a página antes da resposta: a tentativa salva é reenviada
    await page.reload()
    await app.ready()
    await page.clock.fastForward('00:05')
    await expect(page).toHaveURL(/\/orders\/order-/, { timeout: 15_000 })
    const orders = await checkout.orders()
    expect(orders).toHaveLength(1)
    expect(new URL(page.url()).pathname).toBe(`/orders/${orders[0].id}`)
  })
})
