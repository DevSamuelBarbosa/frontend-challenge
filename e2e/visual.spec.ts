import type { Page } from '@playwright/test'
import { expect, test } from './support/app'
import { Checkout } from './support/checkout'
import { users } from './support/users'

/**
 * Regressão visual de início, detalhe, carrinho e pagamento, em desktop e celular.
 * Os dados são os das fixtures (cenário padrão, banco restaurado a cada teste) e as
 * animações ficam desligadas, então a imagem só muda quando a interface muda.
 * As baselines ficam em `e2e/visual.spec.ts-snapshots/` e são versionadas. Elas dependem
 * do sistema operacional (renderização de fontes): regere com `npm run test:e2e:update-visual`.
 */

/** Espera fontes e imagens, rolando a página para carregar as imagens preguiçosas */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    const step = Math.max(400, innerHeight - 100)
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 80))
    }
    scrollTo(0, 0)
    await document.fonts.ready
    // Imagens preguiçosas fora da área rolável (ex.: carrosséis) podem nunca carregar: o
    // limite evita esperar para sempre por elas
    const loaded = (img: HTMLImageElement) =>
      img.complete ||
      Promise.race([
        new Promise((resolve) => img.addEventListener('load', resolve, { once: true })),
        new Promise((resolve) => setTimeout(resolve, 2_000)),
      ])
    await Promise.all([...document.images].map(loaded))
  })
  await page.waitForLoadState('networkidle')
}

const options = { fullPage: true, maxDiffPixelRatio: 0.0005, animations: 'disabled' } as const

test.describe('regressão visual', () => {
  test('início', async ({ app, page }) => {
    await app.open('/')
    await expect(page.locator('#mercado').getByRole('article').first()).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', {
      ...options,
      // O destaque do topo troca de slide sozinho: a imagem não pode depender do instante
      mask: [page.getByRole('region', { name: 'Destaques', exact: true })],
    })
  })

  test('detalhe do NFT', async ({ app, page }) => {
    await app.open('/nfts/nft-001')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', options)
  })

  test('carrinho', async ({ app, page }) => {
    await app.login(users.ana)
    const checkout = new Checkout(app)
    await checkout.seedCart([
      { nftId: 'nft-001', editionId: 'nft-001-ed50', quantity: 2 },
      { nftId: 'nft-003', editionId: 'nft-003-ed50', quantity: 1 },
    ])
    await app.goto('/cart')
    await expect(page.getByRole('main').getByText('Emerald Ape #042').first()).toBeVisible()
    await expect(page.getByRole('main').locator('dl[aria-busy="true"]')).toHaveCount(0)
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', options)
  })

  test('pagamento', async ({ app, page }) => {
    await app.login(users.ana)
    const checkout = new Checkout(app)
    await checkout.seedCart([
      { nftId: 'nft-001', editionId: 'nft-001-ed50', quantity: 2 },
      { nftId: 'nft-003', editionId: 'nft-003-ed50', quantity: 1 },
    ])
    await checkout.open()
    await expect(checkout.form().getByLabel('Nome de exibição')).toHaveValue(users.ana.name)
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png', options)
  })
})
