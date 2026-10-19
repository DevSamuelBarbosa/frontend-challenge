import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
// `E2E_BASE_URL` aponta a suíte para uma versão já publicada (ex.: a da Vercel): nesse caso
// não há build nem servidor local
const REMOTE_URL = process.env.E2E_BASE_URL
const BASE_URL = REMOTE_URL ?? `http://localhost:${PORT}`

/**
 * Testes E2E contra o build de produção com a API simulada (MSW). Cada teste roda num
 * contexto novo do navegador (armazenamento e Service Worker próprios) e abre a aplicação
 * com `?scenario=`, que restaura o banco simulado: nenhum estado passa de um teste a outro.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // Sem animações: telas estáveis para as asserções e a regressão visual
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 414, height: 896 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: REMOTE_URL
    ? undefined
    : {
        command: `npx vite build --logLevel warn && npx vite preview --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
