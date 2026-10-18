import { expect, test } from './support/app'
import { Catalog, urlSearch } from './support/catalog'

test.describe('catálogo: busca, filtros, ordenação e paginação', () => {
  test('a busca filtra a grade e fica na URL', async ({ app, page }) => {
    await app.open('/')
    const catalog = new Catalog(app)
    const before = await catalog.total()

    await catalog.search('Nomad')

    const result = await catalog.expectApiResult({ q: 'Nomad' })
    expect(result.total).toBeGreaterThan(0)
    expect(result.total).toBeLessThan(before)
    await expect.poll(() => catalog.total()).toBe(result.total)

    // Acesso direto à mesma URL mostra o mesmo resultado
    await page.reload()
    await app.ready()
    await catalog.expectNames(result.items.map((nft) => nft.name))
  })

  test('filtros combinados e ordenação mostram o que a API devolve', async ({ app, page }) => {
    await app.open('/')
    const catalog = new Catalog(app)
    const allTotal = await catalog.total()

    await catalog.toggleFilter('Rede', 'Ethereum')
    await catalog.toggleFilter('Coleções', 'Arte digital')
    await catalog.toggleFilter('Coleções', 'Fotografia')
    await catalog.sortBy('Menor preço')
    await catalog.closeFilters()

    await expect
      .poll(() => urlSearch(page))
      .toMatchObject({
        network: ['ethereum'],
        category: ['digital_art', 'photography'],
        sort: 'price_asc',
      })
    const result = await catalog.expectApiResult({
      network: 'ethereum',
      category: ['digital_art', 'photography'],
      sort: 'price_asc',
    })
    expect(result.total).toBeLessThan(allTotal)
    const prices = await catalog.prices()
    expect(prices).toEqual([...prices].sort((a, b) => a - b))

    // Desmarcar a rede devolve os itens das outras redes
    await catalog.toggleFilter('Rede', 'Ethereum')
    await catalog.closeFilters()
    await expect.poll(() => urlSearch(page).network).toBeUndefined()
    await catalog.expectApiResult({ category: ['digital_art', 'photography'], sort: 'price_asc' })
  })

  test('a faixa de preço limita os preços exibidos', async ({ app, page }) => {
    await app.open('/')
    const catalog = new Catalog(app)
    const allTotal = await catalog.total()
    const panel = await catalog.filters()

    // Desce o teto em 11 ETH pelo teclado (cada PageDown anda 0,10)
    const maxThumb = panel.getByRole('slider', { name: 'Preço máximo' })
    await maxThumb.focus()
    for (let i = 0; i < 110; i++) await maxThumb.press('PageDown')
    await panel.getByRole('button', { name: 'Aplicar' }).click()
    await catalog.closeFilters()

    await expect.poll(() => urlSearch(page).maxPrice).toBeDefined()
    const maxPrice = String(urlSearch(page).maxPrice)
    const result = await catalog.expectApiResult({ maxPrice })
    expect(result.total).toBeLessThan(allTotal)
    const prices = await catalog.prices()
    expect(prices.length).toBeGreaterThan(0)
    for (const price of prices) expect(price).toBeLessThanOrEqual(Number(maxPrice))
  })

  test('paginação, volta à página 1 ao filtrar e restauração pelo histórico', async ({
    app,
    page,
  }) => {
    await app.open('/')
    const catalog = new Catalog(app)
    const firstPage = await catalog.names()

    await catalog.goToPage(2)
    await expect.poll(() => urlSearch(page).page).toBe(2)
    const secondPage = (await catalog.expectApiResult({ page: '2' })).items.map((n) => n.name)
    expect(secondPage).not.toEqual(firstPage)

    // Mudar a ordenação volta para a primeira página
    await catalog.sortBy('Maior preço')
    await catalog.closeFilters()
    await expect.poll(() => urlSearch(page)).toEqual({ sort: 'price_desc' })
    const sorted = (await catalog.expectApiResult({ sort: 'price_desc' })).items.map((n) => n.name)

    await page.goBack()
    await expect.poll(() => urlSearch(page)).toEqual({ page: 2 })
    await catalog.expectNames(secondPage)

    await page.goBack()
    await expect.poll(() => urlSearch(page)).toEqual({})
    await catalog.expectNames(firstPage)

    await page.goForward()
    await page.goForward()
    await expect.poll(() => urlSearch(page)).toEqual({ sort: 'price_desc' })
    await catalog.expectNames(sorted)
  })

  test('acesso direto com filtros na URL restaura a tela', async ({ app }) => {
    await app.open('/?category=music&sort=price_desc')
    const catalog = new Catalog(app)
    await catalog.expectApiResult({ category: 'music', sort: 'price_desc' })

    const panel = await catalog.filters()
    await expect(
      panel.getByRole('group', { name: 'Coleções' }).getByRole('button', { name: /Música/ }),
    ).toHaveAttribute('aria-pressed', 'true')
    const scope = app.isMobile ? panel : catalog.section
    await expect(scope.getByRole('combobox', { name: 'Ordenar por:' })).toHaveText(/Maior preço/)
  })

  test('respostas fora de ordem não sobrescrevem o filtro mais recente', async ({ app, page }) => {
    // Neste cenário as consultas ao catálogo alternam entre 1,8 s e 150 ms
    await app.open('/', { scenario: 'out-of-order' })
    const catalog = new Catalog(app)
    await catalog.names()

    await catalog.toggleFilter('Coleções', 'Música')
    await catalog.toggleFilter('Coleções', 'Jogos')
    await catalog.closeFilters()
    await expect.poll(() => urlSearch(page).category).toEqual(['music', 'games'])

    const result = await catalog.expectApiResult({ category: ['games', 'music'] })
    // A resposta lenta da consulta anterior chega depois e não pode trocar a grade
    await page.waitForTimeout(2_000)
    expect(await catalog.names()).toEqual(result.items.map((n) => n.name))
  })
})
