import type { Page } from '@playwright/test'
import type { Profile, Wallet } from '../src/api/contracts'
import { expect, test } from './support/app'
import { users } from './support/users'

/** PNG de 1×1 pixel, gerado em memória para o upload do avatar */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const profileForm = (page: Page) => page.getByRole('form', { name: 'Dados do perfil' })
const save = (page: Page) => profileForm(page).getByRole('button', { name: 'Salvar' })

test.describe('perfil: dados, avatar e senha', () => {
  test('valida os campos, recusa usuário em uso e salva as alterações', async ({ app, page }) => {
    await app.login(users.ana, { redirect: '/profile' })
    const form = profileForm(page)
    await expect(form.getByLabel('Nome de exibição')).toHaveValue(users.ana.name)

    await form.getByLabel('Nome de exibição').fill('')
    await form.getByLabel('E-mail').fill('sem-arroba')
    await form.getByLabel('Nome ENS').fill('ab')
    await save(page).click()
    await expect(form.getByText('Informe seu nome')).toBeVisible()
    await expect(form.getByText('Informe um e-mail válido')).toBeVisible()
    await expect(form.getByText(/Use um nome ENS válido/)).toBeVisible()
    await expect(form.getByLabel('Nome de exibição')).toBeFocused()
    await expect(form.getByLabel('Nome de exibição')).toHaveAttribute('aria-invalid', 'true')

    await form.getByLabel('Nome de exibição').fill('Ana R. Ribeiro')
    await form.getByLabel('E-mail').fill(users.ana.email)
    await form.getByLabel('Nome ENS').fill('anaribeiro')
    await form.getByLabel('Apelido da carteira').fill('MetaMask do dia a dia')
    await form.getByLabel('Nome de usuário').fill(users.bruno.username)
    await save(page).click()
    await expect(form.getByText('Este nome de usuário já está em uso')).toBeVisible()
    await expect(form.getByLabel('Nome de usuário')).toBeFocused()
    // Os outros campos continuam como foram digitados
    await expect(form.getByLabel('Nome de exibição')).toHaveValue('Ana R. Ribeiro')

    await form.getByLabel('Nome de usuário').fill(users.ana.username)
    await save(page).click()
    await expect(page.getByText('Perfil atualizado')).toBeVisible()

    const profile = await app.api<Profile>('/profile')
    expect(profile).toMatchObject({ name: 'Ana R. Ribeiro', ensName: 'anaribeiro.eth' })
    const wallets = await app.api<Wallet[]>('/wallets')
    expect(wallets.find((w) => w.role === 'primary')?.label).toBe('MetaMask do dia a dia')

    await page.reload()
    await app.ready()
    await expect(form.getByLabel('Nome de exibição')).toHaveValue('Ana R. Ribeiro')
    await expect(form.getByLabel('Nome ENS')).toHaveValue('anaribeiro')
  })

  test('troca de senha: validações, senha atual errada e sucesso', async ({ app, page }) => {
    await app.login(users.ana, { redirect: '/profile' })
    const form = profileForm(page)
    const current = form.getByLabel('Senha atual')
    const next = form.getByLabel('Nova senha', { exact: true })
    const confirm = form.getByLabel('Confirmar nova senha')

    await next.fill('curta')
    await save(page).click()
    await expect(form.getByText('Informe sua senha atual')).toBeVisible()
    await expect(form.getByText('A senha deve ter pelo menos 8 caracteres')).toBeVisible()
    await expect(form.getByText('As senhas não coincidem')).toBeVisible()

    await current.fill('SenhaErrada1')
    await next.fill('NovaSenha2026')
    await confirm.fill('NovaSenha2026')
    await save(page).click()
    await expect(form.getByText('Senha atual incorreta')).toBeVisible()
    // Nada do que foi digitado se perde com o erro
    await expect(next).toHaveValue('NovaSenha2026')

    await current.fill(users.ana.password)
    await save(page).click()
    await expect(page.getByText('Perfil e senha atualizados')).toBeVisible()
    await expect(current).toHaveValue('')

    // A senha antiga deixa de entrar e a nova funciona
    await app.logout()
    await app.goto('/login')
    const login = app.loginForm()
    await login.getByPlaceholder('contato@email.com').fill(users.ana.email)
    await login.getByPlaceholder('Senha').fill(users.ana.password)
    await login.getByRole('button', { name: 'Entrar' }).click()
    await expect(login.getByRole('alert')).toHaveText('E-mail ou senha incorretos')
    await login.getByPlaceholder('Senha').fill('NovaSenha2026')
    await login.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL('/')
  })

  test('avatar: recusa formato inválido, envia e remove', async ({ app, page }) => {
    await app.login(users.ana, { redirect: '/profile' })
    const avatar = page.getByRole('group', { name: 'Avatar' })
    const input = avatar.locator('input[type=file]')

    await input.setInputFiles({
      name: 'notas.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('x'),
    })
    await expect(avatar.getByRole('alert')).toHaveText('Use uma imagem PNG, JPEG ou WebP')

    await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByText('Avatar atualizado')).toBeVisible()
    await expect(avatar.locator('img')).toBeVisible()
    expect((await app.api<Profile>('/profile')).avatarUrl).toMatch(/^data:image\//)

    await avatar.getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByText('Avatar removido')).toBeVisible()
    await expect(avatar.locator('img')).toHaveCount(0)
    await expect(avatar.getByRole('button', { name: 'Remover' })).toBeDisabled()
    expect((await app.api<Profile>('/profile')).avatarUrl).toBeNull()
  })
})

test.describe('carteiras', () => {
  const primaryForm = (page: Page) => page.getByRole('form', { name: 'Carteira principal' })
  const secondaryForm = (page: Page) => page.getByRole('form', { name: 'Carteira secundária' })

  test('edita a carteira principal com validação e conflito de endereço', async ({ app, page }) => {
    await app.login(users.ana, { redirect: '/wallets' })
    const form = primaryForm(page)
    const wallets = await app.api<Wallet[]>('/wallets')
    const secondary = wallets.find((w) => w.role === 'secondary')!

    await form.getByLabel('Endereço da carteira').fill('0xabc')
    await form.getByLabel('Código de indicação').fill('x')
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(
      form.getByText('Informe um endereço válido (0x seguido de 40 caracteres)'),
    ).toBeVisible()
    await expect(form.getByText(/Informe o código de indicação/)).toBeVisible()

    // O endereço da carteira secundária já está cadastrado
    await form.getByLabel('Endereço da carteira').fill(secondary.address)
    await form.getByLabel('Código de indicação').fill('NOVO-2026')
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(form.getByText('Esta carteira já está cadastrada na sua conta')).toBeVisible()

    const primary = wallets.find((w) => w.role === 'primary')!
    await form.getByLabel('Endereço da carteira').fill(primary.address)
    await form
      .getByRole('group', { name: 'Rede' })
      .getByRole('checkbox', { name: 'Solana' })
      .click()
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira atualizada')).toBeVisible()

    const saved = (await app.api<Wallet[]>('/wallets')).find((w) => w.role === 'primary')!
    expect(saved.referralCode).toBe('NOVO-2026')
    expect(saved.networks).toContain('solana')
  })

  test('cadastra a carteira secundária e ela aparece no pagamento', async ({ app, page }) => {
    await app.login(users.bruno, { redirect: '/wallets' })
    await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible()

    await page.getByRole('button', { name: 'Adicionar' }).click()
    const form = secondaryForm(page)
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(form.getByText('Informe um nome para a carteira')).toBeVisible()
    await expect(form.getByText('Selecione uma rede')).toBeVisible()
    await expect(form.getByText('Selecione o tipo de carteira')).toBeVisible()

    await form.getByLabel('Apelido da carteira').fill('Phantom reserva')
    await form
      .getByRole('group', { name: 'Rede' })
      .getByRole('checkbox', { name: 'Polygon' })
      .click()
    await form.getByLabel('Endereço da carteira').fill('0x00000000219ab540356cBB839Cbe05303d7705Fa')
    await form.getByLabel('Tipo de carteira').click()
    await page.getByRole('option', { name: 'Phantom' }).click()
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira cadastrada')).toBeVisible()

    const wallets = await app.api<Wallet[]>('/wallets')
    expect(wallets.map((w) => w.role)).toEqual(['primary', 'secondary'])

    // A carteira nova fica disponível para escolher no pagamento
    await app.api('/cart/items', {
      method: 'POST',
      body: { nftId: 'nft-003', editionId: 'nft-003-ed50', quantity: 1 },
    })
    await app.goto('/checkout')
    await expect(page.getByRole('radio', { name: /Phantom reserva/ })).toBeVisible()
  })
})
