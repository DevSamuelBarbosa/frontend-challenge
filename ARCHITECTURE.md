# Arquitetura

Documento vivo: registra as decisões técnicas, as políticas de estado e as limitações conhecidas. Contratos REST detalhados, desvios do Figma e resultados do Lighthouse são acrescentados nas etapas seguintes.

## Visão geral

```
src/
  api/          transporte: cliente Axios, contratos zod, funções por recurso
  queries/      TanStack Query: chaves, queryOptions e mutations
  features/     regras de tela que não cabem em uma query (catálogo, checkout)
  realtime/     cliente Socket.IO: conexão por sessão e aplicação dos eventos no cache
  routes/       TanStack Router (rotas por arquivo)
  components/   componentes compartilhados e shadcn/ui
  lib/          utilitários (ETH em decimal, query client, redirecionamento)
mocks/          API simulada com MSW (REST e Socket.IO), reutilizada em dev, demo e testes
```

O fluxo de dados é sempre o mesmo: **contrato zod → função da API (Axios) → query/mutation → componente**. Componentes, hooks e o cliente Axios não contêm respostas fictícias: toda a simulação fica na camada de rede (`mocks/`).

### Contratos tipados

Os schemas de `src/api/contracts` são a única definição dos dados:

- geram os tipos TypeScript (`z.infer`);
- validam as respostas da API em tempo de execução (`parseResponse`): uma resposta fora do contrato vira `ApiError` na camada de transporte, em vez de dados inválidos na tela;
- validam os corpos das requisições nos handlers do MSW, com as mesmas mensagens exibidas nos formulários.

Valores em ETH trafegam como **string decimal** (até 18 casas) e todo cálculo usa `big.js` (`src/lib/eth.ts`), no cliente e nos mocks. Quantidades são inteiras.

### Erros

Toda falha sai do Axios como `ApiError` (`src/api/errors.ts`), com `code` (`validation_error`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `server_error`, `timeout`, `network_error`, `cancelled`), `fields` (erros por campo) e `details` (ex.: `reason: 'quote_outdated'`). `isRetryable` marca o que pode ser repetido com segurança: 5xx, falha de rede e timeout.

## Cache, retries e sincronização

### Chaves

Definidas em `src/queries/keys.ts`.

| Dado                  | Chave                         | Observação                                                      |
| --------------------- | ----------------------------- | --------------------------------------------------------------- |
| Sessão                | `['session']`                 |                                                                 |
| Catálogo              | `['nfts', 'list', params]`    | `params` canônico: sem campos vazios e com categorias ordenadas |
| Detalhe               | `['nfts', 'detail', nftId]`   |                                                                 |
| Carrinho do visitante | `['guest-cart', guestCartId]` |                                                                 |
| Dados privados        | `['user', userId, ...]`       | favoritos, carrinho, cotação, pedidos, carteiras                |

Dados privados ficam sempre sob `['user', userId]`: o cache é isolado por usuário e o logout ou a troca de usuário removem tudo de uma vez (`clearPrivateData`).

### Política por recurso

| Recurso            | `staleTime` | Retry automático               | Outros                                                                         |
| ------------------ | ----------- | ------------------------------ | ------------------------------------------------------------------------------ |
| Padrão (consultas) | 30 s        | até 2×, só falhas transitórias | `refetchOnWindowFocus`                                                         |
| Sessão             | 5 min       | não (401 vira "sem sessão")    | revalidada no horário de expiração                                             |
| Catálogo           | 30 s        | até 2×                         | `keepPreviousData` (página anterior visível ao trocar filtros)                 |
| Cotação            | 0           | até 2×                         | refeita ao mudar o carrinho, cupom ou rede e a cada `nft.updated` dos itens    |
| Pedido             | 30 s        | até 2×                         | consulta a cada 4 s **só enquanto pendente** (reserva caso um evento se perca) |
| Mutations          | —           | **não**                        | exceto a criação de pedido (ver abaixo)                                        |

Erros 4xx nunca são repetidos automaticamente: 404, 401 e validação são definitivos.

### Respostas obsoletas e fora de ordem

- Cada combinação de parâmetros do catálogo tem a própria chave: uma resposta atrasada de uma busca anterior só atualiza o cache daquela busca e nunca aparece na tela atual.
- O `signal` do TanStack Query é repassado ao Axios: requisições que deixam de ser necessárias são canceladas.
- Uma resposta 401 só encerra a sessão local se o token enviado ainda for o atual. Uma resposta atrasada de uma sessão anterior não derruba a sessão nova.

### Mutations e concorrência

| Mutation  | Estratégia                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Favoritos | **atualização otimista com rollback**. O rollback desfaz só a alteração que falhou, não um snapshot inteiro, para não apagar outras alterações otimistas feitas em seguida. As requisições saem em série (`scope`), para "favoritar" e "desfavoritar" rápidos não chegarem invertidos ao servidor. O `onMutate` roda na hora, mesmo com a mutation na fila. A revalidação acontece quando a última termina. |
| Carrinho  | em série (`scope: 'cart'`). A resposta da API, que valida estoque e limite por pedido, substitui o cache. A cotação é invalidada.                                                                                                                                                                                                                                                                           |
| Pedido    | ver [Checkout](#checkout). Repete falhas transitórias com a **mesma chave de idempotência**.                                                                                                                                                                                                                                                                                                                |

## Sessão

- Só o token fica no `localStorage` (`src/api/session-token.ts`). Os dados do usuário vêm sempre de `GET /auth/session`.
- O interceptor do Axios envia `Authorization: Bearer`. Um 401 com `session_expired` ou `session_invalid` encerra a sessão local.
- `syncSessionWithToken` mantém o cache coerente com o token, inclusive para login, logout ou troca de usuário feitos em outra aba (evento `storage`).
- Rotas privadas ficam sob o layout `_authenticated`: sem sessão, redirecionam para `/login?redirect=<endereço completo>`. O motivo da expiração é exibido uma vez.
- O parâmetro `redirect` só aceita caminhos internos, o que evita redirecionamento aberto.
- `SessionWatcher` revalida a rota quando a sessão muda e consulta a sessão no horário de `expiresAt`, mesmo sem interação.
- Na expiração, o pagamento em andamento é preservado para o mesmo usuário retomar. No logout explícito, é descartado.

## Carrinho

- O carrinho do visitante também fica na API, identificado por um id anônimo (`X-Guest-Cart-Id`) criado no primeiro item. Assim as regras de estoque e limite existem em um lugar só e o cliente tem um único caminho.
- Ao autenticar, `POST /cart/merge` junta os carrinhos no servidor: as quantidades são somadas e limitadas à disponibilidade. Se a junção falhar, o id do visitante é mantido e ela é tentada de novo.
- Nome, preço e estoque dos itens vêm do catálogo atual. A **cotação** é a referência de valores (subtotal, desconto, taxa de rede e total) e acusa divergências (`price_changed`, `quantity_reduced`, `sold_out`).
- **Resumo do carrinho**: subtotal, desconto, taxa de rede e total vêm sempre da cotação (`POST /quote`), nunca de somas no cliente. A cotação também vale para o carrinho do visitante, só para o resumo: o pedido continua exigindo login. O cupom fica no mesmo estado do pagamento (por usuário ou visitante) e acompanha o usuário ao entrar e ao seguir para o checkout.
- **Alterações em andamento**: ao mudar uma quantidade, o resumo já fica em "atualizando" até a nova cotação chegar. Os controles do item alterado ficam desabilitados até a resposta, para um clique rápido não usar uma quantidade desatualizada.
- **Itens indisponíveis**: itens esgotados ou acima do estoque (inclusive por eventos em tempo real) ganham aviso na linha, com "Ajustar", e bloqueiam o botão de finalizar até serem corrigidos.

## Checkout

Regras em `src/features/checkout/controller.ts`, independentes da interface:

1. **Revisão:** valida os dados e registra um resumo dos valores aceitos (itens, preços, cupom, taxa e total).
2. **Confirmação:** refaz a cotação. Qualquer diferença em relação ao que foi aceito, ou um item esgotado ou reduzido, exige nova confirmação. O servidor também recusa uma cotação desatualizada (`409 quote_outdated`).
3. **Idempotência:** a chave e o corpo do pedido são gravados **antes** do envio. Uma tentativa sem resposta (timeout, queda, refresh) é sempre reenviada com a mesma chave e o mesmo corpo, e o servidor devolve o pedido já criado.
4. **Cliques repetidos:** confirmações simultâneas recebem o mesmo resultado (trava no controlador), e as requisições saem em série.
5. **Pendente:** o estado chega por `order.updated` e, como reserva, por consulta a cada 4 s. A tela de confirmação só aparece para pedido confirmado.
6. **Recusado:** a tentativa é descartada e o carrinho é preservado. Uma nova tentativa usa outra chave.
7. **Confirmado:** o servidor remove do carrinho apenas as quantidades compradas. O recibo é o snapshot do pedido e não muda se o catálogo mudar.

**Formulário e revisão.** O formulário usa `react-hook-form` com o mesmo esquema zod do contrato do pedido, então cliente e API validam as mesmas regras; os erros que a API devolve voltam para os campos (os caminhos coincidem, ex.: `collector.email`). O rascunho persiste a cada alteração e é pré-preenchido com os dados do perfil sem sobrescrever o que já foi digitado. "Confirmar compra" valida os campos, conecta a carteira (se preciso), refaz a cotação e abre um **diálogo de revisão** com foco preso; nele o usuário confirma o envio. Se preço, disponibilidade, cupom ou taxa mudarem enquanto o diálogo está aberto, ele muda para "Os valores mudaram" e exige nova confirmação; itens esgotados ou reduzidos levam a "Itens indisponíveis" e à volta ao carrinho. O mesmo diálogo acompanha o pedido pendente (não fecha com Esc) e a recusa; depois de um refresh, ele reabre e retoma a mesma tentativa.

O estado do pagamento (rascunho, valores aceitos e tentativa) fica no `localStorage` por usuário e sobrevive a refresh, reconexão e expiração da sessão.

## Tempo real

### Eventos

| Evento            | Escopo              | Efeito no cliente                                                                                                                            |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `nft.updated`     | público             | atualiza preço e disponibilidade no detalhe, catálogo, favoritos e carrinhos. Refaz a cotação afetada e gera aviso de alteração no carrinho. |
| `order.updated`   | só o dono do pedido | atualiza o estado do pedido. Confirmado ou recusado é terminal.                                                                              |
| `session.invalid` | conexão             | revalida a sessão (o 401 leva ao login)                                                                                                      |

Todo evento tem `id` estável (`<recurso>:<id>:v<versão>`), recurso e versão, e é validado com zod.

### Regras

- **Versão:** um evento só é aplicado se for mais novo que o dado em cache. Duplicatas e eventos antigos não têm efeito, e um evento atrasado não sobrescreve um dado mais novo vindo do REST.
- **Efeitos únicos:** ids já processados são lembrados para não repetir efeitos, como avisos.
- **Uma conexão por sessão:** login, logout ou troca de usuário fecham a conexão anterior com todos os listeners, então eventos de uma sessão não alcançam outra.
- **Reconciliação:** depois de uma reconexão, os recursos em uso (catálogo, carrinho, cotação, pedidos, favoritos) são buscados de novo no REST, que é a fonte da verdade.

## Mocks (MSW)

- **Ativação:** `VITE_ENABLE_MOCKS=true`, ligada por padrão, inclusive no build de demonstração. O MSW e a aplicação são carregados dinamicamente.
- **Banco simulado:** fica em memória e é persistido no `localStorage`. Todas as alterações de catálogo passam por `updateEditions`, que incrementa a versão e emite o `nft.updated`, então REST e eventos nunca divergem.
- **Cenários** (`mocks/scenarios/definitions.ts`): latência determinística (sorteio com semente), falhas por regra (`before`/`after` do handler) e gatilhos. Selecionados com `?scenario=<nome>` ou `window.__mocks.setScenario()`. Ativar um cenário restaura o banco.
- **Controles** (`window.__mocks`): reset, expiração de sessão, mudança de preço e estoque, finalização de pedidos e controles do tempo real (derrubar conexões, reenviar eventos, enviar evento antigo). O objeto só é exposto depois de o service worker estar ativo.

## Decisões e limitações

- **MSW 2.x, e não 3.x:** `@mswjs/socket.io-binding` (0.2.0) declara compatibilidade só com `msw ^2.10.2`.
- **Socket.IO sobre MSW**, com transporte só WebSocket (`transports: ['websocket']`): o binding não simula long-polling.
- **O MSW remove o prefixo `/socket.io/`** da URL antes de comparar com o handler, então o `ws.link` aponta para a origem da aplicação.
- **O binding não envia ping.** O mock envia a cada 25 s, para o cliente não desconectar por "ping timeout".
- **O binding confirma o namespace sem ler a autenticação.** O mock lê o pacote `CONNECT` cru para identificar a sessão e, para recusá-la, envia o pacote `CONNECT_ERROR` (`44`): o cliente emite `connect_error` e não entra em loop de reconexão.
- **Servidor de tempo real fora do ar:** o mock dispara `error` antes de fechar a conexão, como o navegador faz. Sem isso, o `socket.io-client` fica travado.
- **Ordem de carregamento:** o transporte WebSocket do engine.io guarda a referência do `WebSocket` global ao ser importado. Por isso `main.tsx` inicia os mocks antes de importar a aplicação. O CSS é importado na entrada para não atrasar a primeira pintura.
- **Links de exploração:** seguem o formato dos exploradores reais, mas o hash é simulado. A interface sinaliza que a referência é simulada.
- **`npm audit`:** os alertas "high" vêm do CLI do `shadcn` (dependência de desenvolvimento, fora do bundle).
- **Imagens dos NFTs**: os 4 assets do Figma (PNG 1254×1254, ~2 MB cada) foram convertidos para WebP em 240, 480 e 960 px (308 KB no total) e servidos com `srcset`, para não pesar no carregamento. Os 36 NFTs do catálogo reutilizam essas 4 artes. Os avatares de criadores e usuários seguem como SVGs gerados, pois o design não traz esses assets.
- **Dados alinhados ao design**: coleções, redes (Ethereum, Polygon e Solana), preço anterior riscado, selo RARO, avaliações e edições 1/1, 1/10, 1/50 e aberta seguem o Figma. Os 9 primeiros NFTs reproduzem nomes, preços e ordem da tela inicial.

## Desvios do Figma e decisões de UX

Onde o design e os requisitos do desafio conflitam ou o design é ambíguo, a decisão está aqui.

**Pagamento**

- **Revisão antes do envio:** o design não tem esse passo, mas o enunciado exige revisão e nova confirmação diante de mudanças. Ela é um diálogo aberto por "Confirmar compra".
- **Carteiras cadastradas:** o enunciado pede usar as carteiras cadastradas, então "Tipo de carteira", "Endereço da carteira" e a lista "Carteira e rede" mostram e selecionam essas carteiras, e o endereço é somente leitura. A rede só oferece as que a carteira suporta.
- **"Usar outra carteira?":** no design não há texto de apoio. Foi implementado como "enviar os NFTs para outra carteira ou ENS": habilita o campo "ENS ou carteira secundária", que passa a ser obrigatório.
- **Mobile:** o frame mobile só mostra a escolha de carteira e rede, mas os campos do colecionador são obrigatórios, então eles aparecem abaixo. A lista de provedores do frame vira a escolha de rede.
- **Código de indicação e nome ENS são obrigatórios** (asteriscos do design). O código aceita qualquer valor de 3 a 20 caracteres (ex.: `KURIO2026`).
- **Cupom:** "Aplique aqui" abre o mesmo formulário de cupom do carrinho; o cupom é compartilhado entre as duas telas.

**Confirmação do pedido**

- O frame existe só no desktop (um modal). A rota `/orders/:id` abre o recibo em um diálogo no desktop e em **tela cheia** no celular, sem frame. Fechar (X ou Esc) leva ao início.
- O recibo só aparece para pedido **confirmado**. Pendente mostra "Pagamento pendente" e muda sozinho para o recibo (consulta periódica e evento `order.updated`); recusado mostra o motivo e volta ao carrinho.
- Itens, valores, carteira e colecionador vêm do snapshot gravado no pedido. As linhas da cotação guardam também a imagem e o ID do token, então o recibo não muda se o catálogo mudar. Um pedido de outro usuário responde 404.
- Acrescentado ao design: botão para copiar o ID da transação, o rótulo "Referência simulada" junto ao link de exploração e, com cupom, as linhas de subtotal e desconto. O texto do link acompanha a rede (Etherscan, Polygonscan ou Solscan).

**Carrinho**

- A taxa de rede simulada da Ethereum foi ajustada para reproduzir os 0,016 ETH do design.
- Os valores dos itens do frame mobile não somam o subtotal exibido; as telas usam os dados reais dos mocks.

**Catálogo e detalhe**

- A coluna da direita do catálogo mobile não é deslocada para baixo como no frame, para os cards ficarem alinhados.
- O frame mobile do detalhe repete a edição "1/10"; a tela usa 1/1, 1/10, 1/50 e aberta, como no desktop.
- No desktop do detalhe, os rótulos "Contrato" e "Direitos autorais" estão trocados com seus textos; cada rótulo mostra o seu conteúdo.
- O texto do segundo banner da tela inicial está cortado no design; foi completado com "cultura da internet".
- Itens fora do escopo (Criadores, Aprenda, ações sociais, newsletter, escanear) aparecem desabilitados e anunciam "indisponível nesta demonstração".

**Login e cadastro**

- No desktop são um modal sobre a tela inicial (inerte e escondida de leitores de tela); no mobile, uma página inteira sem navegação inferior nem rodapé. Em ambos é a mesma rota (`/login`, `/register`), então acesso direto e refresh funcionam, e o `?redirect=` volta ao fluxo anterior.
- O cadastro pede usuário, e-mail, senha e confirmação. O nome de exibição começa igual ao usuário e é editado no perfil.
- Os erros dos formulários aparecem só após a primeira tentativa de envio. Validar ao sair do campo deslocava o layout no meio do clique em outro elemento (ex.: a aba "Criar conta"), e o clique se perdia.
- Cliques seguidos em "Entrar"/"Criar conta" geram uma única requisição (`useSingleFlight`), e o envio nativo do navegador é sempre cancelado, para a senha nunca ir para a URL.
- Login social e "Esqueceu a senha?" ficam desabilitados (fora do escopo).
