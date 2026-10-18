import { expect, test } from './support/app'
import { Catalog } from './support/catalog'
import { Checkout } from './support/checkout'
import { users } from './support/users'

test.describe('carregamento lento: skeletons', () => {
  test('o catálogo mostra o esqueleto e depois os cards, sem trocar o layout', async ({
    app,
    page,
  }) => {
    // Neste cenário toda resposta demora 2,5 s
    await app.open('/', { scenario: 'slow' })
    const catalog = new Catalog(app)
    const grid = catalog.grid()

    await expect(grid).toHaveAttribute('aria-busy', 'true')
    await expect(catalog.cards()).toHaveCount(0)
    const before = await grid.boundingBox()

    await expect(grid).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 })
    await expect(catalog.cards()).toHaveCount(9)
    const after = await grid.boundingBox()
    // A grade ocupa o mesmo lugar: o conteúdo não empurra o que está abaixo
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2)
    expect(page.url()).not.toContain('scenario')
  })

  test('o detalhe mostra o esqueleto e depois o NFT', async ({ app, page }) => {
    await app.open('/nfts/nft-001', { scenario: 'slow' })
    await expect(page.getByLabel('Carregando NFT')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByLabel('Carregando NFT')).toHaveCount(0)
  })

  test('carrinho e resumo mostram esqueletos enquanto carregam', async ({ app, page }) => {
    await app.login(users.ana)
    const checkout = new Checkout(app)
    await checkout.seedCart([{ nftId: 'nft-001', editionId: 'nft-001-ed50', quantity: 1 }])
    await app.mocks((mocks) => mocks.setScenario('slow', { reset: false }))
    await app.goto('/cart')

    await expect(page.getByLabel('Carregando itens do carrinho')).toBeVisible()
    await expect(page.getByLabel('Carregando itens do carrinho')).toHaveCount(0, {
      timeout: 15_000,
    })
    await expect(page.getByRole('main').getByText('Emerald Ape #042').first()).toBeVisible()
  })

  test('perfil e carteiras mostram esqueletos e depois os formulários', async ({ app, page }) => {
    await app.login(users.ana)
    await app.mocks((mocks) => mocks.setScenario('slow', { reset: false }))

    await app.goto('/wallets')
    await expect(page.getByLabel('Carregando carteiras')).toBeVisible()
    await expect(page.getByRole('form', { name: 'Carteira principal' })).toBeVisible({
      timeout: 15_000,
    })

    await app.goto('/profile')
    await expect(page.getByLabel('Carregando perfil')).toBeVisible()
    await expect(page.getByRole('form', { name: 'Dados do perfil' })).toBeVisible({
      timeout: 15_000,
    })
  })
})

test.describe('falhas e recuperação', () => {
  test('o catálogo mostra o erro, e "Tentar novamente" recupera quando a API volta', async ({
    app,
    page,
  }) => {
    // O catálogo responde 503 nas primeiras consultas (com as repetições automáticas) e se recupera
    await app.open('/', { scenario: 'server-error' })
    const alert = page
      .getByRole('alert')
      .filter({ hasText: 'Não foi possível carregar o catálogo.' })
    await expect(alert).toBeVisible({ timeout: 20_000 })
    await expect(alert).toContainText('Serviço temporariamente indisponível')

    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    const catalog = new Catalog(app)
    await expect(catalog.cards()).toHaveCount(9, { timeout: 15_000 })
    await expect(alert).toBeHidden()
  })

  test('sem conexão: o erro aparece e a volta da conexão recupera a tela', async ({
    app,
    page,
  }) => {
    await app.open('/', { scenario: 'offline' })
    const alert = page
      .getByRole('alert')
      .filter({ hasText: 'Não foi possível carregar o catálogo.' })
    await expect(alert).toBeVisible({ timeout: 20_000 })

    // A conexão volta (o banco não é restaurado) e o usuário tenta de novo
    await app.mocks((mocks) => mocks.setScenario('default', { reset: false }))
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(new Catalog(app).cards().first()).toBeVisible({ timeout: 15_000 })
    await expect(alert).toBeHidden()
  })

  test('API fora do ar ao abrir uma área privada: erro da rota e recuperação', async ({
    app,
    page,
  }) => {
    await app.login(users.ana)
    // Com a API toda em erro, até a sessão falha: quem trata é o erro da rota
    await app.mocks((mocks) => mocks.setScenario('server-down', { reset: false }))
    await app.goto('/favorites')

    const alert = page.getByRole('alert').filter({ hasText: 'Algo deu errado' })
    await expect(alert).toBeVisible({ timeout: 20_000 })
    // O erro tem saída, e o resto do site continua no ar
    await expect(alert.getByRole('link', { name: 'Voltar para o início' })).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()

    await app.mocks((mocks) => mocks.setScenario('default', { reset: false }))
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('heading', { name: 'Lista de interesse' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(alert).toBeHidden()
  })

  test('catálogo vazio mostra o estado vazio, não um erro', async ({ app, page }) => {
    await app.open('/', { scenario: 'empty' })
    await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})
