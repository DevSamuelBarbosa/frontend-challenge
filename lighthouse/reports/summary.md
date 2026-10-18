# Relatório Lighthouse

Mediana de 3 medições por página e perfil. Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

| Página         | Perfil  | Performance | Accessibility | Best Practices | SEO |     LCP |   CLS |    TBT |
| -------------- | ------- | ----------: | ------------: | -------------: | --: | ------: | ----: | -----: |
| Início         | Mobile  |       83 ⚠️ |           100 |            100 | 100 | 3407 ms | 0.000 | 316 ms |
| Início         | Desktop |          98 |           100 |            100 | 100 | 1079 ms | 0.000 |  10 ms |
| Detalhe do NFT | Mobile  |       85 ⚠️ |           100 |            100 | 100 | 3560 ms | 0.000 | 206 ms |
| Detalhe do NFT | Desktop |          98 |           100 |            100 | 100 | 1046 ms | 0.005 |   0 ms |

## Ambiente

- **generatedAt**: 2026-10-18T23:16:07.962Z
- **lighthouse**: 13.5.0
- **chrome**: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36
- **node**: v22.14.0
- **os**: Linux 6.8.0-146-generic (x64)
- **cpu**: Intel(R) Core(TM) i5-7400 CPU @ 3.00GHz × 4
- **memoryGb**: 16
- **app**: nft-marketplace@0.0.0
- **conditions**: Build de produção (vite build + vite preview), API simulada com MSW no cenário padrão, Chrome headless novo por medição (perfil limpo), throttling simulado do Lighthouse (simulate), 3 medições por página e perfil, mediana reportada.

## Medições individuais

| Página         | Perfil  |   # | Perf | A11y |  BP | SEO |     LCP |   CLS |    TBT | Relatório (medição mediana)                                     |
| -------------- | ------- | --: | ---: | ---: | --: | --: | ------: | ----: | -----: | --------------------------------------------------------------- |
| Início         | Mobile  |   1 |   82 |  100 | 100 | 100 | 3331 ms | 0.000 | 349 ms | —                                                               |
| Início         | Mobile  |   2 |   83 |  100 | 100 | 100 | 3407 ms | 0.000 | 299 ms | [html](inicio-mobile-2.html) · [json](inicio-mobile-2.json)     |
| Início         | Mobile  |   3 |   83 |  100 | 100 | 100 | 3427 ms | 0.000 | 316 ms | —                                                               |
| Início         | Desktop |   1 |   98 |  100 | 100 | 100 | 1080 ms | 0.000 |  10 ms | —                                                               |
| Início         | Desktop |   2 |   98 |  100 | 100 | 100 | 1028 ms | 0.000 |  10 ms | [html](inicio-desktop-2.html) · [json](inicio-desktop-2.json)   |
| Início         | Desktop |   3 |   98 |  100 | 100 | 100 | 1079 ms | 0.000 |  11 ms | —                                                               |
| Detalhe do NFT | Mobile  |   1 |   85 |  100 | 100 | 100 | 3541 ms | 0.000 | 206 ms | [html](detalhe-mobile-1.html) · [json](detalhe-mobile-1.json)   |
| Detalhe do NFT | Mobile  |   2 |   76 |  100 | 100 | 100 | 3788 ms | 0.000 | 401 ms | —                                                               |
| Detalhe do NFT | Mobile  |   3 |   86 |  100 | 100 | 100 | 3560 ms | 0.000 | 167 ms | —                                                               |
| Detalhe do NFT | Desktop |   1 |   98 |  100 | 100 | 100 | 1046 ms | 0.005 |   0 ms | —                                                               |
| Detalhe do NFT | Desktop |   2 |   98 |  100 | 100 | 100 | 1095 ms | 0.005 |   0 ms | [html](detalhe-desktop-2.html) · [json](detalhe-desktop-2.json) |
| Detalhe do NFT | Desktop |   3 |   98 |  100 | 100 | 100 | 1043 ms | 0.005 |   0 ms | —                                                               |
