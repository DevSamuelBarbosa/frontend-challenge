import { expect, type Page } from '@playwright/test'
import type { Order } from '../../src/api/contracts'
import type { App } from './app'

/** Tela de pagamento e diálogo de revisão do pedido */
export class Checkout {
  readonly page: Page

  constructor(readonly app: App) {
    this.page = app.page
  }

  /** Preparação pela API: itens no carrinho da conta logada, como se viessem do catálogo */
  async seedCart(items: { nftId: string; editionId: string; quantity: number }[]) {
    for (const item of items) await this.app.api('/cart/items', { method: 'POST', body: item })
  }

  async open() {
    await this.app.goto('/checkout')
    await expect(this.form()).toBeVisible()
    // Sem a cotação, o botão ainda não pode enviar
    await expect(
      this.page.getByRole('main').locator('dt', { hasText: 'Subtotal' }).first(),
    ).toBeVisible()
  }

  form() {
    return this.page.getByRole('form', { name: 'Dados do pedido' })
  }

  /** Completa os campos obrigatórios que o perfil não preenche */
  async fillRequired() {
    await this.form().getByLabel('Código de indicação').fill('KURIO2026')
  }

  confirmButton() {
    return this.page.getByRole('button', { name: /^(Confirmar compra|Preparando pedido…)$/ })
  }

  dialog() {
    return this.page.getByRole('dialog')
  }

  sendButton() {
    return this.dialog().getByRole('button', { name: 'Confirmar e enviar' })
  }

  /** Abre a revisão e espera ela estar pronta para o envio */
  async review() {
    await this.confirmButton().click()
    await expect(this.dialog().getByRole('heading', { name: 'Revise seu pedido' })).toBeVisible()
    await expect(this.sendButton()).toBeEnabled()
  }

  orders() {
    return this.app.api<Order[]>('/orders')
  }

  async cartQuantities() {
    const cart = await this.app.api<{ items: { quantity: number }[] }>('/cart')
    return cart.items.map((item) => item.quantity)
  }

  receiptHeading() {
    return this.page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })
  }
}
