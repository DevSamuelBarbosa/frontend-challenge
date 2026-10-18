import type { Order } from '../src/api/contracts'
import { expect, test } from './support/app'
import { Cart } from './support/cart'
import { Checkout } from './support/checkout'
import { users } from './support/users'

// nft-001: a edição 1/50 é a padrão do detalhe e custa 1.19 ETH nas fixtures
const NFT = 'nft-001'
const EDITION = 'nft-001-ed50'
const ITEMS = [
  { nftId: NFT, editionId: EDITION, quantity: 2 },
  { nftId: 'nft-003', editionId: 'nft-003-ed50', quantity: 1 },
]

test.describe('tempo real: preço e disponibilidade', () => {
  test('o detalhe aberto recebe o novo preço e o esgotamento pelo Socket.IO', async ({
    app,
    page,
  }) => {
    await app.open(`/nfts/${NFT}`)
    await expect(page.getByRole('main')).toContainText('1.19 ETH')
    await app.waitRealtime()
    const refetches = app.recordRequests(new RegExp(`^/api/nfts/${NFT}$`))

    await app.mocks((mocks, id) => mocks.changePrice(id, '1.5', 'nft-001-ed50'), NFT)
    await expect(page.getByRole('main')).toContainText('1.50 ETH')

    await app.mocks((mocks, id) => mocks.setAvailability(id, 0, 'nft-001-ed50'), NFT)
    await expect(
      page.getByRole('main').getByRole('button', { name: /^(ESGOTADO|Esgotado)$/ }),
    ).toBeDisabled()

    // A tela mudou sem buscar o NFT de novo: os dados vieram do evento
    expect(refetches).toEqual([])
  })

  test('o carrinho avisa a mudança de preço e recalcula o resumo', async ({ app, page }) => {
    await app.login(users.ana)
    const checkout = new Checkout(app)
    const cart = new Cart(app)
    await checkout.seedCart([{ nftId: NFT, editionId: EDITION, quantity: 2 }])
    await app.goto('/cart')
    await cart.expectSubtotal(2.38)
    await app.waitRealtime(users.ana.id)

    await app.mocks((mocks, id) => mocks.changePrice(id, '1.5', 'nft-001-ed50'), NFT)
    const notice = page.getByRole('status').filter({ hasText: 'mudou de' })
    await expect(notice).toContainText('mudou de 1.19 ETH para 1.50 ETH')
    await cart.expectSubtotal(3)

    await notice.getByRole('button', { name: 'Dispensar aviso' }).click()
    await expect(notice.getByText('mudou de')).toHaveCount(0)
  })

  test('preço muda com a revisão aberta: exige nova confirmação e usa o valor novo', async ({
    app,
  }) => {
    await app.login(users.ana)
    const checkout = new Checkout(app)
    await checkout.seedCart(ITEMS)
    await checkout.open()
    await checkout.fillRequired()
    await checkout.review()
    await app.waitRealtime(users.ana.id)

    await app.mocks((mocks, id) => mocks.changePrice(id, '1.5', 'nft-001-ed50'), NFT)
    const dialog = checkout.dialog()
    await expect(dialog.getByRole('heading', { name: 'Os valores mudaram' })).toBeVisible()
    await expect(checkout.sendButton()).toHaveCount(0)

    await dialog.getByRole('button', { name: 'Revisar novos valores' }).click()
    await expect(checkout.sendButton()).toBeEnabled()
    await checkout.sendButton().click()
    await expect(app.page).toHaveURL(/\/orders\/order-/, { timeout: 15_000 })

    const [order] = await checkout.orders()
    expect(order.lines.find((line) => line.nftId === NFT)?.unitPriceEth).toBe('1.5')
  })

  test('item esgota com a revisão aberta: bloqueia o envio', async ({ app }) => {
    await app.login(users.ana)
    const checkout = new Checkout(app)
    await checkout.seedCart(ITEMS)
    await checkout.open()
    await checkout.fillRequired()
    await checkout.review()
    await app.waitRealtime(users.ana.id)

    await app.mocks((mocks, id) => mocks.setAvailability(id, 0, 'nft-001-ed50'), NFT)
    const dialog = checkout.dialog()
    await expect(
      dialog.getByRole('heading', { name: /Os valores mudaram|Itens indisponíveis/ }),
    ).toBeVisible()
    await expect(checkout.sendButton()).toHaveCount(0)
    expect(await checkout.orders()).toEqual([])
  })
})

test.describe('tempo real: eventos repetidos, desconexão e pedido pendente', () => {
  test('eventos duplicados e antigos não reaplicam nem desfazem a mudança', async ({
    app,
    page,
  }) => {
    // Neste cenário cada evento chega duas vezes e é seguido da versão anterior
    await app.login(users.ana, { scenario: 'realtime-chaos' })
    const checkout = new Checkout(app)
    const cart = new Cart(app)
    await checkout.seedCart([{ nftId: NFT, editionId: EDITION, quantity: 1 }])
    await app.goto('/cart')
    await cart.expectSubtotal(1.19)
    await app.waitRealtime(users.ana.id)

    await app.mocks((mocks, id) => mocks.changePrice(id, '1.5', 'nft-001-ed50'), NFT)
    await cart.expectSubtotal(1.5)
    // Reenvios explícitos: a última versão de novo e uma versão antiga
    await app.mocks((mocks, id) => mocks.realtime.replayLast('nft', id), NFT)
    await app.mocks((mocks, id) => mocks.realtime.emitStaleNft(id), NFT)
    await page.waitForTimeout(500)

    // Um único aviso, e o valor continua o mais recente
    await expect(page.getByText('mudou de 1.19 ETH para 1.50 ETH')).toHaveCount(1)
    expect(await cart.value('Subtotal')).toBeCloseTo(1.5, 6)
  })

  test('evento perdido durante a desconexão é recuperado ao reconectar', async ({ app, page }) => {
    await app.open(`/nfts/${NFT}`)
    await expect(page.getByRole('main')).toContainText('1.19 ETH')
    await app.waitRealtime()

    // Derruba a conexão e muda o preço antes de o cliente reconectar: o evento se perde
    await app.mocks(async (mocks, id) => {
      mocks.realtime.dropConnections()
      await mocks.changePrice(id, '1.5', 'nft-001-ed50')
    }, NFT)

    // Ao reconectar, o cliente busca de novo na API o que está na tela
    await app.waitRealtime()
    await expect(page.getByRole('main')).toContainText('1.50 ETH', { timeout: 15_000 })
  })

  test('sem o servidor de tempo real, a API REST continua funcionando', async ({ app, page }) => {
    await app.open(`/nfts/${NFT}`, { scenario: 'realtime-offline' })
    await expect(page.getByRole('main')).toContainText('1.19 ETH')
    expect(await app.mocks((mocks) => mocks.realtime.connections().length)).toBe(0)

    // Sem eventos, o valor novo aparece na próxima consulta (mais barato, a 1/50 segue padrão)
    await app.mocks((mocks, id) => mocks.changePrice(id, '1.1', 'nft-001-ed50'), NFT)
    await page.reload()
    await app.ready()
    await expect(page.getByRole('main')).toContainText('1.10 ETH')
  })

  test('pedido pendente é retomado e confirmado pelo evento do pedido', async ({ app, page }) => {
    // Relógio controlado: o pagamento leva 3 s e a consulta de reserva só roda a cada 4 s
    await page.clock.install()
    await app.login(users.ana)
    const checkout = new Checkout(app)
    await checkout.seedCart(ITEMS)
    await checkout.open()
    await checkout.fillRequired()
    await checkout.review()
    await checkout.sendButton().click()
    await expect(
      checkout.dialog().getByRole('heading', { name: 'Pagamento pendente' }),
    ).toBeVisible()

    // Recarregar com o pagamento em andamento: o pedido continua sendo acompanhado
    await page.reload()
    await app.ready()
    const [pending] = await checkout.orders()
    expect(pending.status).toBe('pending')
    await expect(
      checkout.dialog().getByRole('heading', { name: 'Pagamento pendente' }),
    ).toBeVisible()
    await app.waitRealtime(users.ana.id)

    const refetches = app.recordRequests(new RegExp(`^/api/orders/${pending.id}$`))
    await page.clock.fastForward(3_200)

    // Confirmado pelo evento `order.updated`, antes de qualquer nova consulta ao pedido
    await expect(page).toHaveURL(`/orders/${pending.id}`)
    await expect(checkout.receiptHeading()).toBeVisible()
    expect(refetches).toEqual([])
    const orders = await app.api<Order[]>('/orders')
    expect(orders).toHaveLength(1)
    expect(orders[0].status).toBe('confirmed')
  })
})
