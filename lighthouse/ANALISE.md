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
| Início         | Mobile  |          92 |           100 |            100 | 100 | 2,71 s | 0,000 | 213 ms |
| Início         | Desktop |          99 |           100 |            100 | 100 | 0,82 s | 0,000 |   6 ms |
| Detalhe do NFT | Mobile  |          90 |           100 |            100 | 100 | 2,95 s | 0,000 | 182 ms |
| Detalhe do NFT | Desktop |          99 |           100 |            100 | 100 | 0,88 s | 0,005 |   0 ms |

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. **Todas atendidas.**

A margem no **detalhe mobile é pequena**: as 3 medições deram 90, 90 e 93. O perfil mobile simula
CPU 4× mais lenta e rede de 1,6 Mbps, e o resultado varia alguns pontos de uma execução para a
outra.

## O que pesava no mobile e o que foi feito

O perfil mobile do Lighthouse simula um celular modesto (CPU 4× mais lenta, 1,6 Mbps e 150 ms de
latência). Os números abaixo são medidos nos relatórios.

1. **Ícone do site com 1,1 MB.** O `favicon.png` era uma imagem de 1254×1254. O navegador baixa o
   ícone junto com a página e, na rede simulada, esse 1,1 MB disputava a banda com a imagem do LCP.
   Sozinho, ele levava o LCP de 3,3 s para 8,7 s e a nota de 86 para 66. Agora o `favicon.png` tem
   64×64 (3 KB) e há um `apple-touch-icon.png` de 180×180 (23 KB).
2. **Dependência do MSW sem uso na aplicação.** O chunk dos mocks tinha 478 KB; mais da metade
   eram `tough-cookie` e `tldts` (lista de sufixos públicos de domínio), que o MSW usa só para o
   armazenamento de cookies. A aplicação autentica por token e não usa cookies. No build, o `tldts`
   é trocado por um stub de poucas linhas (`mocks/shims/tldts.ts`, alias em `vite.config.ts`).
   O chunk caiu para 214 KB e o LCP, de 3,3 s para 2,7 s (nota de 86 para 92).

O que continua pesando é inerente à entrega: a API simulada viaja no bundle (a latência de 120 a
320 ms dela entra no tempo até a imagem do LCP) e o LCP é a imagem do primeiro card, que só é
descoberta depois do JavaScript e da consulta ao catálogo (numa SPA, ela não está no HTML).

## Outras otimizações já presentes

- Rotas com code splitting (o JS de login, carrinho, pagamento etc. não entra na tela inicial).
- Imagens em WebP com `srcset` (240, 480 e 960 px), largura e altura reservadas (CLS ≈ 0) e a
  imagem principal com `loading="eager"` e `fetchpriority="high"`.
- Fonte Roboto Mono servida pela própria aplicação (sem terceiros).
- Esqueletos com as mesmas proporções do conteúdo final.
- SEO: `meta description`, Open Graph, `theme-color` e `robots.txt`.
- Acessibilidade: alvos de toque de 24 px nos pontos dos carrosséis.

## O que foi tentado e descartado

- **Pré-carregar (`modulepreload`) os módulos carregados depois dos mocks.** Sem ganho medível
  dentro da variação das medições.
- **Carregar o `socket.io-client` sob demanda e baixar a aplicação em paralelo com os mocks.** Com
  o ícone leve, essas duas mudanças não foram necessárias para atingir as metas e adicionam risco
  à ordem de carregamento que o Socket.IO exige. Não foram mantidas.

## O que não foi feito, de propósito

Reduzir a latência da API simulada, desligar os mocks ou carregar menos conteúdo na tela inicial
melhoraria a nota, mas a auditoria deve refletir a entrega completa. Nada disso foi alterado.

## Ambiente

Detalhes e versões em [`reports/summary.md`](reports/summary.md). Resumo: Lighthouse 13.5.0,
Chrome 155 headless (novo, a cada medição), Node 22.14, Linux 6.8 (x64), Intel Core i5-7400 com
4 núcleos e 16 GB de RAM, throttling simulado do Lighthouse.
