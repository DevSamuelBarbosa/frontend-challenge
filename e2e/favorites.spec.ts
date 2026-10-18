import type { Page } from '@playwright/test'
import type { FavoriteList } from '../src/api/contracts'
import { expect, test } from './support/app'
import { users } from './support/users'

/** Botão de favoritar do detalhe: com texto no desktop, só ícone sobre a imagem no celular */
const favoriteButton = (page: Page) =>
  page
    .getByRole('main')
    .getByRole('button', { name: /^(Favoritar|Favoritado|Remover dos favoritos)$/ })

// nft-001 não está entre os favoritos iniciais da Ana; nft-002 está
const NOT_FAVORITE = 'nft-001'
const FAVORITE = 'nft-002'

test.describe('favoritos', () => {
  test('visitante é levado ao login e volta para o mesmo NFT', async ({ app, page }) => {
    await app.open(`/nfts/${NOT_FAVORITE}`)
    await favoriteButton(page).click()
    await expect(page).toHaveURL(new RegExp(`/login\\?redirect=%2Fnfts%2F${NOT_FAVORITE}`))

    const form = app.loginForm()
    await form.getByPlaceholder('contato@email.com').fill(users.ana.email)
    await form.getByPlaceholder('Senha').fill(users.ana.password)
    await form.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(`/nfts/${NOT_FAVORITE}`)
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')
  })

  test('favoritar e desfavoritar persistem e aparecem na lista de interesse', async ({
    app,
    page,
  }) => {
    await app.login(users.ana, { redirect: `/nfts/${NOT_FAVORITE}` })
    // Espera o detalhe (o login no celular também tem um título h1)
    await expect(favoriteButton(page)).toBeVisible()
    const name = await page.getByRole('heading', { level: 1 }).innerText()

    await favoriteButton(page).click()
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
    await expect
      .poll(async () => (await app.api<FavoriteList>('/favorites')).nftIds)
      .toContain(NOT_FAVORITE)

    await page.reload()
    await app.ready()
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')

    await app.goto('/favorites')
    const card = page.getByRole('main').getByRole('article').filter({ hasText: name })
    await expect(card).toBeVisible()

    // Desfavoritar pela lista remove o card
    await card
      .getByRole('button', { name: `Remover ${name} dos favoritos` })
      .first()
      .click()
    await expect(card).toHaveCount(0)
    await expect
      .poll(async () => (await app.api<FavoriteList>('/favorites')).nftIds)
      .not.toContain(NOT_FAVORITE)
  })

  test('falha ao favoritar desfaz a mudança otimista e avisa', async ({ app, page }) => {
    await app.login(users.ana, {
      scenario: 'favorites-failure',
      redirect: `/nfts/${NOT_FAVORITE}`,
    })
    const button = favoriteButton(page)
    await expect(button).toHaveAttribute('aria-pressed', 'false')

    // Atraso na API deixa observar o valor otimista antes da resposta
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Não foi possível favoritar. Tente novamente.')).toBeVisible()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    expect((await app.api<FavoriteList>('/favorites')).nftIds).not.toContain(NOT_FAVORITE)
  })

  test('falha ao remover devolve o item e a nova tentativa funciona', async ({ app, page }) => {
    await app.login(users.ana, { scenario: 'favorites-failure', redirect: `/nfts/${FAVORITE}` })
    const button = favoriteButton(page)
    await expect(button).toHaveAttribute('aria-pressed', 'true')

    await button.click()
    await expect(
      page.getByText('Não foi possível remover dos favoritos. Tente novamente.'),
    ).toBeVisible()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    expect((await app.api<FavoriteList>('/favorites')).nftIds).toContain(FAVORITE)

    // A API volta a funcionar (sem restaurar o banco) e o usuário tenta de novo
    await app.mocks((mocks) => mocks.setScenario('default', { reset: false }))
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect
      .poll(async () => (await app.api<FavoriteList>('/favorites')).nftIds)
      .not.toContain(FAVORITE)
    await page.reload()
    await app.ready()
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')
  })

  test('cliques rápidos seguidos terminam no estado do último clique', async ({ app, page }) => {
    await app.login(users.ana, { redirect: `/nfts/${NOT_FAVORITE}` })
    const button = favoriteButton(page)

    for (let i = 0; i < 5; i++) await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect
      .poll(async () => (await app.api<FavoriteList>('/favorites')).nftIds)
      .toContain(NOT_FAVORITE)
    await page.reload()
    await app.ready()
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
  })
})
