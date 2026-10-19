# Relatório Lighthouse

Mediana de 3 medições por página e perfil. Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|--:|--:|--:|--:|--:|--:|--:|
| Início | Mobile | 92 | 100 | 100 | 100 | 2714 ms | 0.000 | 213 ms |
| Início | Desktop | 99 | 100 | 100 | 100 | 816 ms | 0.000 | 6 ms |
| Detalhe do NFT | Mobile | 90 | 100 | 100 | 100 | 2949 ms | 0.000 | 182 ms |
| Detalhe do NFT | Desktop | 99 | 100 | 100 | 100 | 882 ms | 0.005 | 0 ms |

## Ambiente

- **generatedAt**: 2026-10-19T00:52:49.825Z
- **lighthouse**: 13.5.0
- **chrome**: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36
- **node**: v22.14.0
- **os**: Linux 6.8.0-146-generic (x64)
- **cpu**: Intel(R) Core(TM) i5-7400 CPU @ 3.00GHz × 4
- **memoryGb**: 16
- **app**: nft-marketplace@0.0.0
- **conditions**: Build de produção (vite build + vite preview), API simulada com MSW no cenário padrão, Chrome headless novo por medição (perfil limpo), throttling simulado do Lighthouse (simulate), 3 medições por página e perfil, mediana reportada.

## Medições individuais

| Página | Perfil | # | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório (medição mediana) |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|---|
| Início | Mobile | 1 | 91 | 100 | 100 | 100 | 2819 ms | 0.000 | 206 ms | — |
| Início | Mobile | 2 | 92 | 100 | 100 | 100 | 2712 ms | 0.000 | 213 ms | [html](inicio-mobile-2.html) · [json](inicio-mobile-2.json) |
| Início | Mobile | 3 | 92 | 100 | 100 | 100 | 2714 ms | 0.000 | 217 ms | — |
| Início | Desktop | 1 | 99 | 100 | 100 | 100 | 838 ms | 0.000 | 7 ms | — |
| Início | Desktop | 2 | 99 | 100 | 100 | 100 | 796 ms | 0.000 | 5 ms | [html](inicio-desktop-2.html) · [json](inicio-desktop-2.json) |
| Início | Desktop | 3 | 99 | 100 | 100 | 100 | 816 ms | 0.000 | 6 ms | — |
| Detalhe do NFT | Mobile | 1 | 90 | 100 | 100 | 100 | 2978 ms | 0.000 | 182 ms | — |
| Detalhe do NFT | Mobile | 2 | 90 | 100 | 100 | 100 | 2949 ms | 0.000 | 199 ms | [html](detalhe-mobile-2.html) · [json](detalhe-mobile-2.json) |
| Detalhe do NFT | Mobile | 3 | 93 | 100 | 100 | 100 | 2821 ms | 0.000 | 144 ms | — |
| Detalhe do NFT | Desktop | 1 | 98 | 100 | 100 | 100 | 1036 ms | 0.005 | 0 ms | — |
| Detalhe do NFT | Desktop | 2 | 99 | 100 | 100 | 100 | 879 ms | 0.005 | 0 ms | [html](detalhe-desktop-2.html) · [json](detalhe-desktop-2.json) |
| Detalhe do NFT | Desktop | 3 | 99 | 100 | 100 | 100 | 882 ms | 0.005 | 0 ms | — |
