import type { Cart as CartContract } from '../src/api/contracts'
import { expect, test } from './support/app'
import { Cart, sumEth } from './support/cart'
import { users } from './support/users'

test.describe('carrinho', () => {
  test('adicionar pelo detalhe, mudar quantidades e ver o resumo recalculado', async ({ app }) => {
    await app.open('/')
    const cart = new Cart(app)
    const ape = await cart.editionPrice('nft-001', '1/50')
    const second = await cart.editionPrice('nft-002', '1/50')

    await cart.addFromDetail('nft-001', { edition: '1/50', quantity: 2 })
    expect(await cart.quantity(ape.name)).toBe(2)
    await cart.expectSubtotal(sumEth(ape.price, ape.price))

    await cart.addFromDetail('nft-002', { edition: '1/50' })
    await cart.expectSubtotal(sumEth(ape.price, ape.price, second.price))

    // Total = subtotal + taxa de rede, sem desconto
    const subtotal = await cart.value('Subtotal')
    const fee = await cart.value('Taxa de rede')
    expect(await cart.value('Desconto do lançamento')).toBe(0)
    expect(await cart.value('Total')).toBeCloseTo(sumEth(subtotal, fee), 6)

    await cart.setQuantity(ape.name, 'Diminuir')
    await expect.poll(() => cart.quantity(ape.name)).toBe(1)
    await cart.expectSubtotal(sumEth(ape.price, second.price))

    // Limites: mínimo 1 e o menor entre estoque e máximo por pedido
    await expect(cart.stepper(ape.name).getByRole('button', { name: /^Diminuir/ })).toBeDisabled()
    for (let i = 1; i < ape.max; i++) {
      await cart.setQuantity(ape.name, 'Aumentar')
      await expect.poll(() => cart.quantity(ape.name)).toBe(i + 1)
    }
    await expect(cart.stepper(ape.name).getByRole('button', { name: /^Aumentar/ })).toBeDisabled()
    await cart.expectSubtotal(sumEth(...Array(ape.max).fill(ape.price), second.price))
  })

  test('remover itens até o carrinho ficar vazio', async ({ app, page }) => {
    await app.open('/')
    const cart = new Cart(app)
    const ape = await cart.editionPrice('nft-001', '1/50')
    const second = await cart.editionPrice('nft-002', '1/50')
    await cart.addFromDetail('nft-001', { edition: '1/50' })
    await cart.addFromDetail('nft-002', { edition: '1/50' })

    await cart.removeButton(ape.name).click()
    await expect(page.getByText(`${ape.name} foi removido do carrinho`)).toBeVisible()
    await expect(cart.removeButton(ape.name)).toHaveCount(0)
    await cart.expectSubtotal(second.price)

    await cart.removeButton(second.name).click()
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    await page.getByRole('link', { name: 'Explorar NFTs' }).click()
    await expect(page).toHaveURL(/\/#mercado$/)
  })

  test('cupons: inválido, expirado, válido e remoção', async ({ app }) => {
    await app.open('/')
    const cart = new Cart(app)
    const ape = await cart.editionPrice('nft-001', '1/50')
    await cart.addFromDetail('nft-001', { edition: '1/50', quantity: 2 })
    await cart.expectSubtotal(sumEth(ape.price, ape.price))
    const summary = cart.summary()

    await cart.applyCoupon('NAOEXISTE')
    await expect(summary.getByRole('alert')).toBeVisible()
    await expect(cart.couponInput()).toHaveAttribute('aria-invalid', 'true')
    expect(await cart.value('Desconto do lançamento')).toBe(0)

    await cart.applyCoupon('verao25')
    await expect(summary.getByRole('alert')).toContainText(/expirou/i)

    await cart.applyCoupon('bemvindo10')
    await expect(summary.getByRole('status')).toContainText('BEMVINDO10 aplicado')
    const subtotal = await cart.value('Subtotal')
    await expect.poll(() => cart.value('Desconto do lançamento')).toBeCloseTo(subtotal * 0.1, 6)
    const discount = await cart.value('Desconto do lançamento')
    const fee = await cart.value('Taxa de rede')
    expect(await cart.value('Total')).toBeCloseTo(sumEth(subtotal, fee) - discount, 6)

    // O cupom segue após o refresh
    await app.page.reload()
    await app.ready()
    await expect(summary.getByRole('status')).toContainText('BEMVINDO10 aplicado')

    await summary.getByRole('button', { name: 'Remover cupom BEMVINDO10' }).click()
    await expect.poll(() => cart.value('Desconto do lançamento')).toBe(0)
    await expect(cart.couponInput()).toBeVisible()
  })

  test('carrinho do visitante sobrevive ao refresh e é juntado à conta no login', async ({
    app,
    page,
  }) => {
    await app.open('/')
    const cart = new Cart(app)
    const ape = await cart.editionPrice('nft-001', '1/50')
    await cart.addFromDetail('nft-001', { edition: '1/50', quantity: 3 })
    await cart.applyCoupon('BEMVINDO10')
    await expect(cart.summary().getByRole('status')).toContainText('BEMVINDO10 aplicado')

    await page.reload()
    await app.ready()
    expect(await cart.quantity(ape.name)).toBe(3)

    // Entrar leva o carrinho (e o cupom) para a conta
    await app.goto('/login?redirect=%2Fcart')
    const form = app.loginForm()
    await form.getByPlaceholder('contato@email.com').fill(users.ana.email)
    await form.getByPlaceholder('Senha').fill(users.ana.password)
    await form.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL('/cart')
    await expect.poll(() => cart.quantity(ape.name)).toBe(3)
    await expect(cart.summary().getByRole('status')).toContainText('BEMVINDO10 aplicado')
    await expect
      .poll(async () => (await app.api<CartContract>('/cart')).items.map((i) => i.quantity))
      .toEqual([3])

    // Saindo, o visitante não vê mais o carrinho da conta; voltando, ele está lá
    await app.logout()
    await app.goto('/cart')
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    await app.goto('/login?redirect=%2Fcart')
    await form.getByPlaceholder('contato@email.com').fill(users.ana.email)
    await form.getByPlaceholder('Senha').fill(users.ana.password)
    await form.getByRole('button', { name: 'Entrar' }).click()
    await expect.poll(() => cart.quantity(ape.name)).toBe(3)
  })

  test('o carrinho de um usuário não aparece para outro', async ({ app, page }) => {
    await app.login(users.ana)
    const cart = new Cart(app)
    const ape = await cart.editionPrice('nft-001', '1/50')
    await cart.addFromDetail('nft-001', { edition: '1/50' })
    await expect.poll(() => cart.quantity(ape.name)).toBe(1)

    await app.logout()
    await app.goto('/login?redirect=%2Fcart')
    const form = app.loginForm()
    await form.getByPlaceholder('contato@email.com').fill(users.bruno.email)
    await form.getByPlaceholder('Senha').fill(users.bruno.password)
    await form.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL('/cart')
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  })
})
