# Research: Pedidos de evento

## 1. Autenticação da equipe
- **Decision**: reaproveitar a instância NextAuth do admin (`lib/auth/config.ts`). A coleção `usuarios` ganha `papel` e `usuario`. Se o identificador digitado não tem "@", busca por `usuario` (com `papel: "equipe"`); se tem, busca por e-mail, como hoje. `papel` ausente é tratado como `admin`.
- **Rationale**: evita uma terceira instância de NextAuth (o projeto já tem admin e cliente). O proxy já lê `req.auth`.
- **Alternatives**: uma instância separada, com cookie próprio, teria mais código e duplicaria o proxy; PIN por dispositivo foi descartado porque a usuária pediu login com nome e senha.
- O e-mail continua obrigatório e único no modelo. Os usuários da equipe recebem o e-mail técnico `<usuario>@equipe.voxelasduo.local`, que nunca é exibido.

## 2. Restrição por papel
- **Decision**: função pura `rotaPermitidaParaPapel(papel, pathname)` em `lib/auth/papeis.ts`, aplicada no `proxy.ts` depois da autenticação. A equipe só acessa `/admin/evento` e `/admin/evento/*` (páginas) e `/api/admin/evento/*` (API). Fora disso, página → redirect para `/admin/evento`; API → 403 JSON.
- As rotas `/api/produtos`, `/api/pedidos` etc. também passam pelo proxy e são negadas para a equipe.

## 3. Login da área
- `/admin/evento/entrar` é público. As páginas `/admin/evento*` sem sessão redirecionam para ele, e não para `/admin/login`. O formulário usa `autoComplete="username"` / `"current-password"`, `name` estável e `<form>` real, para o navegador oferecer salvar a senha.
- **Limite de tentativas**: coleção `tentativasLogin` `{ chave, falhas, janelaInicio }`. A chave é o identificador normalizado. São 10 falhas em 15 min; depois, recusa até a janela expirar. Sucesso zera o contador. Funciona entre instâncias serverless, diferente de um limite em memória.
- **Duração da sessão**: o `maxAge` padrão do NextAuth é 30 dias (≥ 12 h, FR-032).

## 4. Offline
- **Decision**: IndexedDB nativo, com wrapper mínimo em `components/evento/offline/db.ts`, e service worker estático.
- **Fila**: cada entrada `{ id (UUID do pedido), pedido, fotosPendentes: { itemId, chave, blob }[], fotosEnviadas: { chave → url }, tentativas, ultimoErro, estado }`. As URLs já enviadas ficam gravadas, então uma retentativa não reenvia a foto.
- **Gatilhos**: evento `online`, abertura da tela, intervalo de 20 s enquanto houver pendentes, botão "Tentar de novo". Uma trava em memória evita duas sincronizações simultâneas.
- **Erros**: `TypeError` de rede → "aguardando internet" (sem contar como erro). HTTP 4xx → estado "erro", com a mensagem do servidor. 5xx → continua pendente e tenta de novo.
- **Service worker** (`/sw-evento.js`, escopo `/admin/evento/`): navegações usam network-first com fallback para o cache; `/_next/static/*` usa cache-first; `/api/*` não passa pelo cache. O arquivo fica em `/sw-evento.js` (raiz), então o escopo `/admin/evento/` é permitido sem o cabeçalho `Service-Worker-Allowed`.
- A navegação para `/admin/evento` sem sessão (offline) usa o HTML em cache. O app lê a sessão que vem embutida na página (nome do usuário).

## 5. Idempotência
- `PUT /api/admin/evento/pedidos/[id]` com `id` = UUID do aparelho. Faz `updateOne({ _id: id }, { $set: …, $setOnInsert: { criadoPor, criadoEm } }, { upsert: true })`. Na edição vale a última escrita.
- `_id` string (UUID) na coleção `pedidosEvento`.

## 6. Fotos
- No navegador, `createImageBitmap` + canvas → JPEG com qualidade 0,8, lado maior ≤ 1600px (~200–400 KB). Fallback para `<img>` se o `createImageBitmap` falhar.
- Upload separado (`POST /api/admin/evento/fotos`, multipart `foto`) → `{ url }`. Usa `enviarImagem(..., "eventos")`, com limite de 5 MB e tipos JPEG/PNG/WebP.
- As fotos órfãs (upload feito, pedido não salvo) são aceitas como custo baixo.

## 7. Eventos
- O pedido guarda `evento` (nome), além do `eventoId`. O PUT faz upsert em `eventos` por `nomeNormalizado` (minúsculas, sem acentos nem espaços extras), devolve o id e atualiza `ultimoUsoEm`.
- `GET /api/admin/evento/eventos` devolve a lista ordenada por `ultimoUsoEm`. O último evento usado no aparelho fica no IndexedDB (`cache.ultimoEvento`).

## 8. Busca
- No servidor, `GET /api/admin/evento/pedidos?busca=&evento=`. O termo vira regex escapada, sem diferenciar maiúsculas, em `cliente.nome`; os dígitos do termo também buscam em `cliente.telefone`. Limite de 300 pedidos.
- No aparelho, a lista em cache é filtrada com a mesma regra quando está offline, e os pendentes da fila são somados à lista.

## 9. Direção visual (frontend-design)
- **Assunto**: um "bloco de pedidos de balcão" de feira, usado por adolescentes no celular. Uma tarefa por vez: anotar, salvar e ir para o próximo.
- **Paleta**: os tokens da marca (`--roxo` #7b5cf6 para ações, `--rosa` #ff5bae para destaque, `--turquesa` #31d0c6 para sucesso/enviado, `--laranja` #ff7a00 para pendente, `--creme` como fundo, `--surface` para os cartões). O tema escuro vem dos tokens.
- **Tipografia**: Baloo 2 nos títulos e no nome do cliente; Nunito 17px no corpo e nos campos (≥ 16 px, sem zoom no iOS); Caveat só no "anotado por" e na confirmação, como assinatura de bloco de notas.
- **Assinatura**: cada item é um "cubo" (cartão com a borda inferior grossa na cor do índice, rosa/laranja/turquesa), e o − / + da quantidade é um bloco grande central. A confirmação "Pedido da Ana salvo!" aparece em tela cheia por 1,8 s, com o nome em destaque.
- **Layout**: barra superior fixa (usuário · status da fila · Sair) + duas abas grandes no rodapé ("Anotar" / "Pedidos"), estilo app. O botão "Salvar pedido" fica fixo acima das abas.
- **Qualidade**: alvos ≥ 48px, foco visível, `prefers-reduced-motion` respeitado, sem rolagem horizontal até 320px.
