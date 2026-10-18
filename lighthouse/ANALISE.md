# Análise do Lighthouse

Auditoria de **Início** e **Detalhe do NFT**, em **mobile** e **desktop**, sobre o build de
produção (`vite build` + `vite preview`), com a API simulada (MSW) no cenário padrão e todas as
imagens, fontes e funcionalidades da entrega. Nenhuma simplificação foi feita para melhorar a nota.

Resultados completos: [`reports/summary.md`](reports/summary.md) (medianas e as 3 medições de cada
combinação, versões e ambiente), [`reports/summary.json`](reports/summary.json) e os relatórios
HTML/JSON da medição mediana de cada combinação em [`reports/`](reports/).

## Como reproduzir

```bash
npm run lighthouse
```

O script (`lighthouse/run.mjs`) gera o build, sobe o preview, abre um Chrome novo por medição
(perfil limpo, sem cache nem Service Worker anteriores) e roda 3 medições por página e perfil. Para
experimentar uma combinação: `LH_PAGES=inicio LH_PROFILES=mobile LH_RUNS=1 npm run lighthouse`.

## Resultado (mediana de 3 medições)

| Página         | Perfil  | Performance | Accessibility | Best Practices | SEO |    LCP |   CLS |    TBT |
| -------------- | ------- | ----------: | ------------: | -------------: | --: | -----: | ----: | -----: |
| Início         | Mobile  |      **83** |           100 |            100 | 100 | 3,41 s | 0,000 | 316 ms |
| Início         | Desktop |          98 |           100 |            100 | 100 | 1,08 s | 0,000 |  10 ms |
| Detalhe do NFT | Mobile  |      **85** |           100 |            100 | 100 | 3,56 s | 0,000 | 206 ms |
| Detalhe do NFT | Desktop |          98 |           100 |            100 | 100 | 1,05 s | 0,005 |   0 ms |

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

- **Atendidas:** Accessibility, Best Practices e SEO (100 em todas as combinações) e Performance
  no desktop (98). CLS fica em zero no mobile e em 0,005 no desktop.
- **Abaixo da meta:** Performance no **mobile** (83 no início e 85 no detalhe). Fica entre 76 e 88
  de uma medição para outra; a mediana de 3 medições é o número que vale.

## Por que o mobile fica abaixo de 90

O perfil mobile do Lighthouse simula um celular modesto: CPU 4× mais lenta e rede de 1,6 Mbps com
150 ms de latência. Nesse perfil, LCP (~3,4 s) e TBT (~200–320 ms) concentram a perda. As causas,
medidas nos relatórios:

1. **A API simulada faz parte do que é entregue e viaja no bundle.** O chunk dos mocks
   (`browser-*.js`: MSW, fixtures e o servidor Socket.IO simulado) tem 172 KB transferidos, 41%
   dele sem uso na carga inicial, e custa de 550 a 690 ms de execução com a CPU 4× mais lenta. O
   enunciado exige os mocks ativos também no build, então esse custo é inerente ao cenário
   auditado (num backend real ele não existiria).
2. **O LCP é a imagem do primeiro card e depende dos dados.** Do LCP de ~3,4 s, cerca de 485 ms
   são de "atraso até iniciar o download da imagem": o navegador só descobre a imagem depois de
   carregar o JavaScript, consultar o catálogo (a API simulada tem latência padrão de 120 a 320 ms,
   de propósito) e renderizar. Numa SPA a imagem não está no HTML inicial.
3. **Custo de execução do React, do roteador e do cache** (`render-*.js`: ~760 ms de script na
   CPU lenta) e o CSS que bloqueia a renderização (15 KB, ~150 ms estimados).

Os payloads somam 208 KB de JavaScript transferido (226 KB no total na carga inicial), por isso o
desktop, sem a limitação de CPU e rede, chega a 98.

## O que foi feito

- Rotas com code splitting (o JS de login, carrinho, pagamento etc. não entra na tela inicial).
- Imagens em WebP com `srcset` (240, 480 e 960 px), largura e altura reservadas (CLS ≈ 0) e a
  imagem principal com `loading="eager"` e `fetchpriority="high"`.
- Fonte Roboto Mono servida pela própria aplicação (sem terceiros).
- Esqueletos com as mesmas proporções do conteúdo final.
- SEO: `meta description`, Open Graph, `theme-color` e `robots.txt`.
- Acessibilidade: alvos de toque de 24 px nos pontos dos carrosséis (o ponto desenhado continua
  pequeno).

## O que foi tentado e descartado

- **Pré-carregar (`modulepreload`) os módulos carregados depois dos mocks** (mocks e aplicação).
  Com os dois, o LCP piorou (3,2 s para 4,1 s): eles disputam a banda simulada com o que está no
  caminho crítico. Só com os mocks, o ganho foi nulo dentro da variação das medições. Foi removido.

## O que não foi feito, de propósito

Reduzir a latência da API simulada, desligar os mocks ou carregar menos conteúdo na tela inicial
melhoraria a nota, mas a auditoria deve refletir a entrega completa. Se a meta de 90 no mobile for
prioridade, os próximos passos de menor risco seriam: dividir as fixtures dos mocks em partes
carregadas sob demanda e carregar a imagem do primeiro card sem esperar o catálogo (por exemplo,
embutir os primeiros itens no HTML), o que muda a arquitetura de dados.

## Ambiente

Detalhes e versões em [`reports/summary.md`](reports/summary.md). Resumo: Lighthouse 13.5.0,
Chrome 155 headless (novo, a cada medição), Node 22.14, Linux 6.8 (x64), Intel Core i5-7400 com
4 núcleos e 16 GB de RAM, throttling simulado do Lighthouse.
