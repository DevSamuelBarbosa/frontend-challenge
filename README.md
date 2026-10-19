# Kurio — Marketplace de NFTs

Solução do [Desafio Frontend — Marketplace de NFTs](ENUNCIADO.md): catálogo, detalhe, carrinho,
pagamento com recibo, conta (perfil e carteiras), login e cadastro, com API REST e eventos em tempo
real simulados no próprio navegador.

- **Aplicação publicada:** https://frontend-challenge-two-beta.vercel.app/
- **Decisões técnicas, políticas e limitações:** [`ARCHITECTURE.md`](ARCHITECTURE.md)
- **Auditoria de performance:** [`lighthouse/ANALISE.md`](lighthouse/ANALISE.md)

## Stack

React 19 · TypeScript · Vite · TanStack Router · TanStack Query · Axios · REST · Socket.IO ·
Tailwind CSS v4 · shadcn/ui · MSW (REST e Socket.IO) · Playwright · Lighthouse. Complementares:
zod, react-hook-form, big.js (valores em ETH sem ponto flutuante), sonner.

## Setup

Requer **Node 22 ou superior** e npm.

```bash
npm ci
npm run dev          # http://localhost:5173, já com a API simulada
```

Não há backend nem serviço privado: tudo roda a partir de um checkout limpo.

### Variáveis de ambiente

Os valores padrão estão em `.env` (modelo em `.env.example`). Para sobrescrever localmente, crie
`.env.local`.

| Variável | Padrão | Função |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | URL base da API REST |
| `VITE_ENABLE_MOCKS` | `true` | Liga a API simulada com MSW (REST e Socket.IO). Fica ligada também no build de demonstração. |

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks |
| `npm run build` | Verifica os tipos e gera o build de produção em `dist/` |
| `npm run preview` | Serve o build de produção localmente |
| `npm run typecheck` | Verificação de tipos (app, mocks e testes) |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run test:e2e` | Testes Playwright (desktop e mobile), inclusive regressão visual |
| `npm run test:e2e:ui` | Os mesmos testes no modo interativo |
| `npm run test:e2e:report` | Abre o relatório HTML da última execução |
| `npm run test:e2e:update-visual` | Regera as baselines da regressão visual |
| `npm run lighthouse` | Auditoria Lighthouse (início e detalhe, mobile e desktop, 3 medições) |

Na primeira vez, instale o navegador dos testes: `npx playwright install chromium`.

## Credenciais fictícias

| Usuário | E-mail | Senha | Observação |
| --- | --- | --- | --- |
| Ana Ribeiro | `ana@nftmarket.dev` | `Colecao2026` | 3 favoritos, carteira principal e secundária |
| Bruno Carvalho | `bruno@nftmarket.dev` | `Galeria2026` | sem favoritos e sem carteira secundária |

Também é possível criar uma conta em `/register`. As senhas ficam com hash (PBKDF2) no banco
simulado, nunca em texto.

**Cupons** (no carrinho): `BEMVINDO10` (10% de desconto), `NFT005` (0,005 ETH de desconto,
a partir de 0,1 ETH), `VERAO25` (expirado) e qualquer outro código é inválido.

## API simulada e cenários

O MSW intercepta as chamadas REST e o transporte WebSocket do Socket.IO no navegador. O banco
simulado é persistido no `localStorage` e todas as alterações passam pelo mesmo caminho, então o
REST e os eventos em tempo real nunca divergem.

### Escolher e restaurar um cenário

- Pela URL: `/?scenario=<nome>` (qualquer rota). Ativar um cenário **restaura o banco**.
- Pelo console: `window.__mocks.setScenario('<nome>')` (ou `{ reset: false }` para manter os dados).
- Restaurar o banco: `/?mocks-reset` ou `window.__mocks.reset()`.
- Listar: `window.__mocks.scenarios()`.

| Cenário | O que simula |
| --- | --- |
| `default` | Tudo funciona, latência curta e estável (120 a 320 ms) |
| `empty` | Catálogo sem NFTs e usuários sem favoritos |
| `slow` | Todas as respostas demoram 2,5 s (mostra os skeletons) |
| `variable-latency` | Latência variável entre 200 ms e 2,5 s |
| `out-of-order` | Consultas do catálogo alternam entre lenta e rápida: respostas fora de ordem |
| `offline` | Sem conexão: toda requisição falha |
| `server-error` | O catálogo responde 503 nas primeiras consultas e depois se recupera |
| `server-down` | Toda a API responde 500 |
| `favorites-failure` | Favoritar e desfavoritar falham com 500 (rollback otimista) |
| `session-expiring` | A sessão expira 30 s após o login |
| `forbidden` | Consultar pedidos responde 403 |
| `price-change` | O preço do primeiro item do carrinho sobe 2 s após a cotação |
| `sold-out` | A edição do primeiro item do carrinho esgota 2 s após a cotação |
| `order-timeout` | O pedido é criado, mas a primeira resposta excede o tempo limite |
| `payment-rejected` | A carteira recusa o pagamento |
| `wallet-rejected` | O usuário recusa a conexão na carteira |
| `realtime-chaos` | Eventos duplicados e seguidos de versões antigas |
| `realtime-offline` | O servidor de tempo real recusa conexões (o REST funciona) |

### Controles no console (`window.__mocks`)

| Controle | Efeito |
| --- | --- |
| `changePrice(nftId, '1.5', editionId?)` | Muda o preço e emite `nft.updated` |
| `setAvailability(nftId, 0, editionId?)` | Muda o estoque e emite `nft.updated` |
| `expireSessions(userId?)` | Expira as sessões ativas |
| `settlePendingOrders()` | Finaliza na hora os pedidos pendentes |
| `realtime.dropConnections()` | Derruba as conexões Socket.IO (o cliente reconecta) |
| `realtime.replayLast('nft' \| 'order', id)` | Reenvia o último evento de um recurso (duplicata) |
| `realtime.emitStaleNft(nftId)` | Envia um evento com versão antiga, que o cliente ignora |
| `realtime.connections()` | Lista as conexões abertas |

## Reproduzir os fluxos de falha

Abra a URL com o cenário e siga os passos. Os mesmos fluxos estão automatizados em `e2e/`.

| Fluxo | Como reproduzir | O que observar |
| --- | --- | --- |
| Skeletons | `/?scenario=slow` | Esqueletos no catálogo, detalhe, carrinho e conta, sem deslocar o layout |
| Falha do catálogo e nova tentativa | `/?scenario=server-error` | Erro com "Tentar novamente"; a API se recupera e a tela volta |
| Sem conexão | `/?scenario=offline`, depois `__mocks.setScenario('default', { reset: false })` | Erro; "Tentar novamente" recupera |
| Favoritos com falha | `?scenario=favorites-failure`, entre e favorite um NFT | Coração muda, volta ao estado anterior e aparece o aviso |
| Sessão expirada | `?scenario=session-expiring`, entre e abra `/profile` | Após 30 s, volta ao login com o aviso e retoma a tela |
| Preço mudou | `?scenario=price-change`, vá ao carrinho; ou, no console, `__mocks.changePrice('nft-001','1.5')` | Aviso no carrinho e resumo recalculado; na revisão do pagamento, pede nova confirmação |
| Item esgotou | `?scenario=sold-out` ou `__mocks.setAvailability('nft-001', 0)` | Aviso na linha, "Ajustar" e botão de finalizar bloqueado |
| Pagamento recusado | `?scenario=payment-rejected`, finalize uma compra | "Pagamento recusado", carrinho preservado e nova tentativa |
| Clique repetido | Na revisão, clique várias vezes em "Confirmar e enviar" | Um único pedido |
| Timeout com recuperação | `?scenario=order-timeout`, finalize uma compra | O pedido é criado, a resposta se perde, o app reenvia com a mesma chave e recebe o mesmo pedido |
| Pedido pendente | Finalize e recarregue durante o pagamento (3 s) | A revisão reabre com "Pagamento pendente" e o recibo aparece ao confirmar |
| Eventos duplicados e antigos | `?scenario=realtime-chaos`, e mude um preço pelo console | Um único aviso, valor mais recente |
| Desconexão do tempo real | `__mocks.realtime.dropConnections()` | O cliente reconecta e busca de novo o que está na tela |
| Tempo real fora do ar | `?scenario=realtime-offline` | REST funciona; as mudanças aparecem ao recarregar |
| Conexão da carteira recusada | `?scenario=wallet-rejected`, no pagamento | Aviso de recusa e "Tentar novamente" |

## Testes

```bash
npx playwright install chromium   # uma vez
npm run test:e2e
```

- Roda contra o **build de produção** (o Playwright faz o build e sobe o preview), em Chromium,
  nos viewports desktop (1440×900) e mobile (414×896).
- Cada teste começa de um estado isolado: contexto de navegador novo e `?scenario=`, que restaura
  o banco simulado. Relógio, latência e eventos em tempo real são controlados nos cenários
  sensíveis a tempo (`page.clock` e `window.__mocks`).
- Os 12 grupos de cenários do enunciado estão em `e2e/*.spec.ts`; o apoio fica em `e2e/support/`.
- Para rodar a suíte contra uma versão já publicada, sem build local:
  `E2E_BASE_URL=https://frontend-challenge-two-beta.vercel.app npx playwright test --grep-invert "regressão visual"`
  (a regressão visual compara com baselines geradas localmente, por isso fica de fora).
- Relatório HTML em `playwright-report/` e traces, vídeos e capturas das falhas em `test-results/`.
- **Regressão visual** de início, detalhe, carrinho e pagamento, com baselines versionadas em
  `e2e/visual.spec.ts-snapshots/`. Elas são geradas no Linux; em outro sistema ou após uma
  mudança de design intencional, regere com `npm run test:e2e:update-visual`.

## Lighthouse

```bash
npm run lighthouse
```

Gera o build, abre um Chrome novo por medição e roda 3 medições por página (início e detalhe) e
perfil (mobile e desktop). Resultados, versões, ambiente e a justificativa dos números abaixo da
meta em [`lighthouse/ANALISE.md`](lighthouse/ANALISE.md); relatórios em `lighthouse/reports/`.

## Estrutura

```
src/        aplicação (api, queries, features, realtime, routes, components, lib)
mocks/      API simulada (handlers REST, banco, fixtures, cenários, servidor Socket.IO simulado)
e2e/        testes Playwright e regressão visual
lighthouse/ auditoria: runner, análise e relatórios
public/     assets estáticos, imagens dos NFTs em WebP e o service worker do MSW
```

## Deploy

Publicado na Vercel (Vite). O `vercel.json` reescreve as rotas da SPA para o `index.html`, então o
acesso direto e o refresh funcionam em qualquer rota, e mantém o cache imutável dos assets. A API
simulada e o tempo real funcionam no ambiente publicado.
