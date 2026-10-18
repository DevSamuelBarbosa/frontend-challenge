import type { Nft } from '../src/api/contracts'
import { expect, test } from './support/app'
import { Catalog, urlSearch } from './support/catalog'

test.describe('detalhe do NFT e recursos inexistentes', () => {
  test('acesso direto ao detalhe mostra os dados da API', async ({ app, page }) => {
    await app.open('/nfts/nft-001')
    const nft = await app.api<Nft>('/nfts/nft-001')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(nft.name)
    await expect(page).toHaveTitle(new RegExp(nft.name))
    await expect(page.getByRole('main').getByText(nft.creator.name).first()).toBeVisible()

    // Refresh mantém a tela
    await page.reload()
    await app.ready()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(nft.name)
  })

  test('do catálogo ao detalhe e de volta, com a busca preservada', async ({ app, page }) => {
    await app.open('/?category=music&sort=price_desc')
    const catalog = new Catalog(app)
    const result = await catalog.expectApiResult({ category: 'music', sort: 'price_desc' })
    const first = result.items[0].name

    await catalog
      .cards()
      .filter({ hasText: first })
      .getByRole('link', { name: first, exact: true })
      .click()
    await expect(page).toHaveURL(/\/nfts\//)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(first)

    await page.goBack()
    await expect.poll(() => urlSearch(page)).toEqual({ category: ['music'], sort: 'price_desc' })
    await catalog.expectNames(result.items.map((nft) => nft.name))
  })

  test('NFT inexistente mostra o 404 com saída para o início', async ({ app, page }) => {
    await app.open('/nfts/nao-existe')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/NFT não encontrado/)
    await page.getByRole('link', { name: 'Voltar para o início' }).click()
    await expect(page).toHaveURL('/')
  })

  test('rota inexistente mostra o 404', async ({ app, page }) => {
    await app.open('/rota/que/nao/existe')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Página não encontrada/)
    await expect(page.getByRole('link', { name: 'Explorar o mercado' })).toBeVisible()
  })

  test('falha da API no detalhe mostra o erro e recupera ao tentar de novo', async ({
    app,
    page,
  }) => {
    await app.open('/nfts/nft-001', { scenario: 'server-down' })
    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o NFT.' })
    await expect(alert).toBeVisible({ timeout: 15_000 })

    await app.mocks((mocks) => mocks.setScenario('default'))
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(alert).toBeHidden()
  })
})
