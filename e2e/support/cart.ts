import { expect, type Page } from '@playwright/test'
import type { Nft } from '../../src/api/contracts'
import type { App } from './app'

/** Converte "1.19 ETH" ou "(-) 0.12" em número */
export const eth = (text: string) => Number(text.match(/(\d+(?:\.\d+)?)/)?.[1] ?? NaN)

/** Soma de valores em ETH sem erro de ponto flutuante (até 18 casas, como a API) */
export const sumEth = (...values: number[]) =>
  Number(values.reduce((total, value) => total + BigInt(Math.round(value * 1e9)), 0n)) / 1e9

/** Carrinho e resumo nos dois layouts (tabela no desktop, cards e folha no celular) */
export class Cart {
  readonly page: Page

  constructor(readonly app: App) {
    this.page = app.page
  }

  /**
   * Adiciona pelo detalhe, como o usuário faria: escolhe a edição, a quantidade e usa
   * "COMPRAR" (desktop) ou "Comprar NFT" (celular), que levam ao carrinho.
   */
  async addFromDetail(
    nftId: string,
    { edition, quantity = 1 }: { edition: string; quantity?: number },
  ) {
    await this.app.goto(`/nfts/${nftId}`)
    const main = this.page.getByRole('main')
    await main
      .locator('label')
      .filter({ hasText: new RegExp(`^${edition.replace('/', '\\/')}$`) })
      .click()
    const stepper = main.getByRole('group', { name: 'Quantidade', exact: true })
    for (let i = 1; i < quantity; i++)
      await stepper.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(stepper.locator('output')).toHaveText(String(quantity))
    await main.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }).click()
    await expect(this.page).toHaveURL('/cart')
  }

  /** Preço da edição pela API, para conferir os valores exibidos */
  async editionPrice(nftId: string, edition: string) {
    const nft = await this.app.api<Nft>(`/nfts/${nftId}`)
    const found = nft.editions.find((e) => e.name === edition)!
    // O limite do controle é o menor entre o estoque e o máximo por pedido
    const max = Math.min(found.available ?? Infinity, found.maxPerOrder)
    return { name: nft.name, price: Number(found.priceEth), max }
  }

  stepper(name: string) {
    return this.page.getByRole('main').getByRole('group', { name: `Quantidade de ${name}` })
  }

  async quantity(name: string) {
    return Number(await this.stepper(name).locator('output').innerText())
  }

  async setQuantity(name: string, direction: 'Aumentar' | 'Diminuir') {
    await this.stepper(name)
      .getByRole('button', { name: `${direction} quantidade de ${name}` })
      .click()
  }

  removeButton(name: string) {
    return this.page.getByRole('main').getByRole('button', { name: `Remover ${name} do carrinho` })
  }

  summary() {
    return this.page.getByRole('region', { name: 'Resumo da carteira' })
  }

  /** Valor de uma linha do resumo, já recalculado (fora do estado de atualização) */
  async value(label: 'Subtotal' | 'Desconto do lançamento' | 'Taxa de rede' | 'Total') {
    const summary = this.summary()
    await expect(summary.locator('dl[aria-busy="true"]')).toHaveCount(0)
    const row = summary
      .locator('dl > div')
      .filter({ has: this.page.locator('dt').getByText(label, { exact: true }) })
    return eth(await row.locator('dd').innerText())
  }

  /** Espera o resumo mostrar este subtotal (a cotação é refeita após cada mudança) */
  async expectSubtotal(expected: number) {
    await expect.poll(() => this.value('Subtotal'), { timeout: 10_000 }).toBeCloseTo(expected, 6)
  }

  couponInput() {
    return this.summary().getByPlaceholder('Digite o código promocional...')
  }

  async applyCoupon(code: string) {
    await this.couponInput().fill(code)
    await this.summary().getByRole('button', { name: 'Aplicar' }).click()
  }
}
