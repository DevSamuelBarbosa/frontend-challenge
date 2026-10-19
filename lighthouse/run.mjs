/**
 * Auditoria Lighthouse de início e detalhe do NFT, em mobile e desktop, sobre o build
 * de produção com a API simulada (cenário padrão) e todas as imagens, fontes e
 * funcionalidades da entrega. Três medições por página e perfil; o relatório usa a
 * mediana de cada categoria e de LCP, CLS e TBT.
 *
 *   npm run lighthouse
 *
 * Saída em `lighthouse/reports/`: HTML e JSON da medição mediana de cada página e perfil,
 * `summary.json` e `summary.md` (as 3 medições, medianas, versões e ambiente).
 */
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'lighthouse', 'reports')
const PORT = 4180
const BASE = `http://localhost:${PORT}`
// Filtros para experimentar (a entrega usa o padrão: tudo, com 3 medições)
//   LH_PAGES=inicio LH_PROFILES=mobile LH_RUNS=1 npm run lighthouse
const only = (name) => process.env[name]?.split(',').filter(Boolean)
const RUNS = Number(process.env.LH_RUNS ?? 3)

const ALL_PAGES = [
  { id: 'inicio', path: '/', label: 'Início' },
  { id: 'detalhe', path: '/nfts/nft-001', label: 'Detalhe do NFT' },
]
const ALL_PROFILES = [
  { id: 'mobile', label: 'Mobile', config: undefined },
  { id: 'desktop', label: 'Desktop', config: desktopConfig },
]
const PAGES = ALL_PAGES.filter((p) => !only('LH_PAGES') || only('LH_PAGES').includes(p.id))
const PROFILES = ALL_PROFILES.filter(
  (p) => !only('LH_PROFILES') || only('LH_PROFILES').includes(p.id),
)
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

// Se o Chrome cair no meio de uma medição, o Lighthouse rejeita uma promessa que nenhum
// `try` captura. A medição em si falha por tempo limite e é repetida.
process.on('unhandledRejection', (error) => {
  if (/Target closed|Connection closed|Session closed/.test(String(error))) return
  throw error
})
const MEASURE_TIMEOUT_MS = 120_000
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`sem resposta em ${ms / 1000} s`)), ms).unref(),
    ),
  ])

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options })
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} saiu com ${code}`)),
    )
  })
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return
    } catch {
      // ainda subindo
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('O servidor de preview não respondeu')
}

async function measure(chrome, page, profile, index) {
  const result = await lighthouse(
    `${BASE}${page.path}`,
    { port: chrome.port, output: ['html', 'json'], logLevel: 'error', onlyCategories: CATEGORIES },
    profile.config,
  )
  const { lhr, report } = result
  const base = `${page.id}-${profile.id}-${index + 1}`
  await writeFile(join(outDir, `${base}.html`), report[0])
  await writeFile(join(outDir, `${base}.json`), report[1])
  const audit = (id) => lhr.audits[id].numericValue
  return {
    scores: Object.fromEntries(
      CATEGORIES.map((id) => [id, Math.round(lhr.categories[id].score * 100)]),
    ),
    lcp: audit('largest-contentful-paint'),
    cls: audit('cumulative-layout-shift'),
    tbt: audit('total-blocking-time'),
    fcp: audit('first-contentful-paint'),
    si: audit('speed-index'),
    file: base,
    version: lhr.lighthouseVersion,
    userAgent: lhr.environment.hostUserAgent,
    emulation: lhr.configSettings.formFactor,
    throttling: lhr.configSettings.throttlingMethod,
  }
}

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

console.log('Gerando o build de produção…')
await run('npx', ['vite', 'build', '--logLevel', 'warn'])

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
})
const summary = []
try {
  await waitForServer()
  for (const page of PAGES) {
    for (const profile of PROFILES) {
      const runs = []
      for (let i = 0; i < RUNS; i++) {
        // Um Chrome novo por medição: perfil limpo, sem cache nem Service Worker anteriores.
        // Se o Chrome cair no meio (falha do ambiente, não da página), repete a medição.
        let result
        for (let attempt = 1; !result; attempt++) {
          const chrome = await launch({
            chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
          })
          try {
            result = await withTimeout(measure(chrome, page, profile, i), MEASURE_TIMEOUT_MS)
          } catch (error) {
            if (attempt >= 3) throw error
            console.warn(`Medição interrompida (${error.message}); tentando de novo…`)
          } finally {
            await chrome.kill()
          }
        }
        runs.push(result)
        console.log(
          `${page.label} / ${profile.label} #${i + 1}: ` +
            CATEGORIES.map((id) => `${id} ${result.scores[id]}`).join(' · ') +
            ` · LCP ${Math.round(result.lcp)} ms · CLS ${result.cls.toFixed(3)} · TBT ${Math.round(result.tbt)} ms`,
        )
      }
      // Guarda só os arquivos da medição mediana (a de Performance do meio); as outras
      // continuam registradas nos números do resumo
      const ranked = [...runs].sort((x, y) => x.scores.performance - y.scores.performance)
      const representative = ranked[Math.floor(ranked.length / 2)]
      for (const run of runs) {
        run.kept = run === representative
        if (!run.kept) {
          await rm(join(outDir, `${run.file}.html`))
          await rm(join(outDir, `${run.file}.json`))
        }
      }
      summary.push({
        page: page.label,
        path: page.path,
        profile: profile.label,
        runs,
        median: {
          scores: Object.fromEntries(
            CATEGORIES.map((id) => [id, median(runs.map((r) => r.scores[id]))]),
          ),
          lcp: median(runs.map((r) => r.lcp)),
          cls: median(runs.map((r) => r.cls)),
          tbt: median(runs.map((r) => r.tbt)),
          fcp: median(runs.map((r) => r.fcp)),
          si: median(runs.map((r) => r.si)),
        },
      })
    }
  }
} finally {
  server.kill()
}

const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const first = summary[0].runs[0]
const environment = {
  generatedAt: new Date().toISOString(),
  lighthouse: first.version,
  chrome: first.userAgent,
  node: process.version,
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: `${os.cpus()[0]?.model} × ${os.cpus().length}`,
  memoryGb: Math.round(os.totalmem() / 1024 ** 3),
  app: `${pkg.name}@${pkg.version}`,
  conditions:
    'Build de produção (vite build + vite preview), API simulada com MSW no cenário padrão, ' +
    'Chrome headless novo por medição (perfil limpo), throttling simulado do Lighthouse ' +
    `(${first.throttling}), ${RUNS} medições por página e perfil, mediana reportada.`,
}
await writeFile(
  join(outDir, 'summary.json'),
  JSON.stringify({ environment, targets: TARGETS, summary }, null, 2),
)

const fmt = (value, digits = 0) => value.toFixed(digits)
const mark = (id, score) => (score >= TARGETS[id] ? '' : ' ⚠️')
let md = `# Relatório Lighthouse\n\n`
md += `Mediana de ${RUNS} medições por página e perfil. Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.\n\n`
md += `| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |\n|---|---|--:|--:|--:|--:|--:|--:|--:|\n`
for (const row of summary) {
  const s = row.median.scores
  md += `| ${row.page} | ${row.profile} | ${fmt(s.performance)}${mark('performance', s.performance)} | ${fmt(s.accessibility)}${mark('accessibility', s.accessibility)} | ${fmt(s['best-practices'])}${mark('best-practices', s['best-practices'])} | ${fmt(s.seo)}${mark('seo', s.seo)} | ${fmt(row.median.lcp)} ms | ${fmt(row.median.cls, 3)} | ${fmt(row.median.tbt)} ms |\n`
}
md += `\n## Ambiente\n\n`
for (const [key, value] of Object.entries(environment)) md += `- **${key}**: ${value}\n`
md += `\n## Medições individuais\n\n| Página | Perfil | # | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório (medição mediana) |\n|---|---|--:|--:|--:|--:|--:|--:|--:|--:|---|\n`
for (const row of summary) {
  row.runs.forEach((r, i) => {
    md += `| ${row.page} | ${row.profile} | ${i + 1} | ${r.scores.performance} | ${r.scores.accessibility} | ${r.scores['best-practices']} | ${r.scores.seo} | ${fmt(r.lcp)} ms | ${fmt(r.cls, 3)} | ${fmt(r.tbt)} ms | ${r.kept ? `[html](${r.file}.html) · [json](${r.file}.json)` : '—'} |\n`
  })
}
await writeFile(join(outDir, 'summary.md'), md)
console.log(`\nRelatórios em ${outDir}`)
