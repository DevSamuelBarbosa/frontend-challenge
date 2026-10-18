import { expect, type Locator, type Page } from '@playwright/test'
import type { App } from './app'

/**
 * Estado do catálogo na URL. O TanStack Router grava listas e valores ambíguos em JSON
 * (`network=["ethereum"]`, `maxPrice="1.20"`); aqui eles voltam a ser valores comuns.
 */
export function urlSearch(page: Page): Record<string, unknown> {
  const params = new URL(page.url()).searchParams
  return Object.fromEntries(
    [...params.keys()].map((key) => {
      const raw = params.get(key)!
      try {
        return [key, JSON.parse(raw)]
      } catch {
        return [key, raw]
      }
    }),
  )
}

/** Converte "1.69 ETH" no número 1.69 */
const toNumber = (text: string) => Number(text.match(/(\d+(?:\.\d+)?) ETH/)?.[1] ?? NaN)

/**
 * O catálogo da tela inicial nos dois layouts: no desktop, filtros na lateral e busca no
 * header; no celular, busca no topo e filtros e ordenação numa gaveta.
 */
export class Catalog {
  readonly page: Page
  readonly section: Locator

  constructor(readonly app: App) {
    this.page = app.page
    this.section = this.page.locator('#mercado')
  }

  cards() {
    return this.section.getByRole('article')
  }

  /** Nomes dos NFTs exibidos agora na grade (fora do carregamento) */
  async names() {
    await expect(this.grid()).not.toHaveAttribute('aria-busy', 'true')
    return this.cards().getByRole('heading', { level: 3 }).allInnerTexts()
  }

  grid() {
    return this.section
      .getByRole('list')
      .filter({ has: this.page.getByRole('article') })
      .or(this.section.locator('ul[aria-busy]'))
      .first()
  }

  /**
   * Espera a grade mostrar exatamente estes NFTs. A URL muda antes da consulta terminar,
   * então a comparação é repetida até a interface refletir o novo estado.
   */
  async expectNames(expected: string[]) {
    await expect.poll(() => this.names(), { timeout: 10_000 }).toEqual(expected)
  }

  /** Busca a mesma consulta na API simulada e espera a grade mostrar o resultado */
  async expectApiResult(query: Record<string, string | string[]>) {
    const params = new URLSearchParams({ sort: 'recent', page: '1', pageSize: '9' })
    for (const [key, value] of Object.entries(query)) {
      params.delete(key)
      for (const item of [value].flat()) params.append(key, item)
    }
    const result = await this.app.api<{ items: { name: string }[]; total: number }>(
      `/nfts?${params}`,
    )
    await this.expectNames(result.items.map((nft) => nft.name))
    return result
  }

  async prices() {
    await this.names()
    // O primeiro valor em ETH do card é o preço atual (o riscado vem depois)
    const texts = await this.cards().allInnerTexts()
    return texts.map(toNumber)
  }

  /** Total anunciado aos leitores de tela ("12 NFTs encontrados") */
  async total() {
    const status = this.section.getByText(/NFTs encontrados$/)
    await expect(status).toBeAttached()
    return Number((await status.textContent())?.match(/\d+/)?.[0])
  }

  async search(term: string) {
    if (this.app.isMobile) {
      await this.page
        .getByRole('searchbox', { name: 'Buscar NFTs, criadores ou atributos' })
        .fill(term)
    } else {
      await this.page.getByRole('button', { name: 'Buscar NFTs' }).click()
      const input = this.page.getByRole('searchbox', {
        name: 'Buscar NFTs, criadores ou atributos',
      })
      await input.fill(term)
      await input.press('Enter')
    }
    await expect.poll(() => urlSearch(this.page).q).toBe(term)
  }

  /** Painel de filtros: a lateral no desktop, a gaveta no celular (aberta sob demanda) */
  async filters() {
    if (!this.app.isMobile) return this.section.getByRole('complementary', { name: 'Filtros' })
    const dialog = this.page.getByRole('dialog', { name: 'Filtros' })
    if (!(await dialog.isVisible())) {
      await this.page.getByRole('button', { name: 'Filtros e ordenação' }).click()
    }
    return dialog
  }

  /** Fecha a gaveta do celular. O Esc pode ser consumido por um seletor ainda fechando. */
  async closeFilters() {
    if (!this.app.isMobile) return
    const dialog = this.page.getByRole('dialog', { name: 'Filtros' })
    await expect(async () => {
      if (await dialog.isVisible()) await this.page.keyboard.press('Escape')
      await expect(dialog).toBeHidden({ timeout: 1_000 })
    }).toPass({ timeout: 8_000 })
  }

  async toggleFilter(group: 'Coleções' | 'Rede', label: string) {
    const panel = await this.filters()
    await panel
      .getByRole('group', { name: group })
      .getByRole('button', { name: new RegExp(`^(Selecionado: )?${label} `) })
      .click()
  }

  async sortBy(label: string) {
    const scope = this.app.isMobile ? await this.filters() : this.section
    await scope.getByRole('combobox', { name: 'Ordenar por:' }).click()
    await this.page.getByRole('option', { name: label }).click()
  }

  async goToPage(page: number) {
    await this.section
      .getByRole('navigation', { name: 'Paginação do catálogo' })
      .getByRole('button', { name: `Página ${page}`, exact: true })
      .click()
  }
}
