# Research: Autenticação e painel do comprador (cliente)

## 1. Segunda instância do NextAuth, separada da do admin

**Decision**: Criar uma segunda instância do NextAuth v5 dedicada ao cliente (`lib/auth/clienteConfig.ts`), com `basePath: "/api/auth/cliente"` e cookie de sessão com nome próprio (`cliente.session-token` / `__Secure-cliente.session-token`), totalmente independente da instância já existente do admin (`lib/auth/config.ts`, Tarefa 9/EDI-86).

**Rationale**: Admin e Cliente são principals diferentes (coleções diferentes — `usuarios` vs. `clientes` —, formatos de sessão diferentes, conjuntos de providers diferentes). Reaproveitar a mesma instância exigiria misturar Credentials providers de dois domínios distintos e um claim de `role` para diferenciar, aumentando o risco de um bug vazar acesso administrativo através do fluxo do cliente (ou vice-versa). Duas instâncias com cookies próprios isolam completamente os dois domínios de sessão — a sessão do cliente não interfere na sessão do admin já em produção (commit `d385dd7`), reduzindo o risco de regressão na Tarefa 9.

**Alternatives considered**: Uma única instância com múltiplos providers e claim `role` — mais "DRY", porém acopla dois domínios de autorização que não têm nenhuma regra em comum (o admin não usa Google, o cliente não deveria nunca ganhar acesso a `/admin`), tornando a revisão de segurança mais difícil.

## 2. Providers do cliente: Credentials (e-mail/senha) + Google, com unificação por e-mail

**Decision**: `clienteConfig.ts` usa `Credentials` (autoriza contra a coleção `clientes`, comparando hash bcrypt) e `Google` (OAuth). Sem adapter de banco do NextAuth (mantém sessão `jwt`, mesmo padrão já validado na Tarefa 9). A unificação de contas por e-mail (decisão do usuário) é feita manualmente no callback `signIn`: ao autenticar via Google, busca-se um cliente existente por e-mail normalizado (minúsculas); se existir (mesmo criado originalmente por e-mail/senha), reaproveita esse `_id` e apenas grava/atualiza o campo `googleId`; se não existir, cria um novo documento `Cliente` só com `googleId` (sem `senhaHash`). Da mesma forma, o cadastro por e-mail/senha primeiro verifica se já existe um cliente com esse e-mail (criado via Google); se existir, apenas adiciona `senhaHash` ao documento existente em vez de criar um segundo.

**Rationale**: Um adapter de banco do NextAuth traria uma coleção `accounts` extra e mudaria a estratégia de sessão para `database` (contrariando o padrão stateless já em uso). Como só há dois providers e a regra de unificação é simples ("mesmo e-mail = mesmo cliente"), resolver diretamente na coleção `clientes` é mais simples e auditável do que adotar o adapter completo do NextAuth só para esse caso.

**Alternatives considered**: Adapter oficial do NextAuth (`@auth/mongodb-adapter`) — trocaria a estratégia de sessão e adicionaria uma coleção nova só para resolver um requisito pontual; rejeitado por complexidade desproporcional ao escopo.

## 3. Recuperação de senha: código numérico embutido no documento do cliente

**Decision**: Código de 6 dígitos, gerado aleatoriamente, armazenado como hash (bcrypt, mesmo padrão da senha) em `Cliente.recuperacaoSenha.codigoHash`, junto de `expiraEm` (agora + 20 minutos). Solicitar um novo código sempre sobrescreve o anterior (invalida automaticamente, sem precisar de coleção própria nem job de limpeza). Após uso bem-sucedido (troca de senha), o campo é removido do documento.

**Rationale**: Volume baixo (uma recuperação por vez por cliente) não justifica uma coleção dedicada com índice TTL — embutir no próprio documento do cliente é mais simples e já resolve "invalidar o código anterior ao gerar um novo" (edge case do spec) de graça, por ser um único campo sobrescrito.

**Alternatives considered**: Coleção `codigosRecuperacaoSenha` com índice TTL do MongoDB — mais "correto" para alto volume, mas complexidade desnecessária para o volume esperado da loja.

## 4. Provedor de e-mail transacional: Resend, API key direta

**Decision**: Pacote `resend`, autenticado via `RESEND_API_KEY` direto em variável de ambiente (`.env.local` / Vercel), remetente configurado em `EMAIL_FROM` sobre domínio próprio já verificado pelo usuário no painel do Resend. Um módulo único `lib/email/resend.ts` centraliza o cliente e as duas funções de envio (`enviarCodigoRecuperacao`, `notificarAdminVendaExterna`).

**Rationale**: Segue exatamente o padrão já estabelecido no projeto para serviços externos (Mercado Pago, Mercado Livre, Shopee — todos com API key própria direto em env var, ver `.env.example`), decisão confirmada com o usuário em vez de provisionar via Vercel Marketplace.

**Alternatives considered**: Resend via Vercel Marketplace (`vercel integration add`) — rejeitado pelo usuário para manter consistência com os demais provedores externos do projeto, que não usam o Marketplace.

## 5. Associação de pedidos ao cliente: campo opcional + correspondência por e-mail em tempo de leitura

**Decision**: `Pedido` ganha um campo opcional `clienteId?: ObjectId`. No checkout do site (`POST /api/pedidos`), se houver uma sessão de cliente válida, `clienteId` é gravado no pedido criado. A área "Meus Pedidos" busca com o filtro `{ $or: [ { clienteId }, { clienteId: { $exists: false }, "cliente.email": emailNormalizado } ] }` — ou seja, pedidos já explicitamente associados **ou** pedidos ainda sem dono cujo e-mail bate com o da conta logada (convidado no site, ou sincronizado de canal externo). Não há job de "backfill" gravando `clienteId` retroativamente nos pedidos antigos — a correspondência acontece a cada leitura, o que também cobre automaticamente pedidos futuros de convidado feitos com o mesmo e-mail antes de uma eventual nova sessão.

**Rationale**: Resolve a decisão do usuário ("associar por e-mail, retroativo") sem precisar de uma migração/job assíncrono nem me preocupar em manter `clienteId` sincronizado toda vez que um novo pedido de convidado ou canal externo chega — a query já cobre os dois casos (associado e não-associado-mas-com-e-mail-batendo) de uma vez.

**Alternatives considered**: Gravar `clienteId` de forma retroativa (eager) no primeiro login/cadastro — evitado porque exigiria repetir a mesma lógica sempre que um novo pedido "órfão" (convidado ou canal externo) chegasse depois da conta já existir, sem ganho real sobre resolver no momento da leitura.

## 6. Extensão do enum de status do pedido

**Decision**: `StatusPedido` (hoje `"pendente" | "pago" | "enviado" | "cancelado"`, `lib/models/pedido.ts`) ganha `"em_producao"` e `"entregue"`, conforme pedido explícito do EDI-84 ("status: pago, em produção, enviado, entregue"). A UI do painel administrativo (Tarefa 8/EDI-81, `app/admin/(painel)/pedidos/page.tsx`) ganha as duas novas opções no seletor de status — sem qualquer validação de transição de estado, mesma regra já vigente (`atualizarStatusPedido` aceita qualquer valor do enum a partir de qualquer status atual).

**Rationale**: O enum atual não cobre os status que o próprio ticket pede para exibir ao cliente; estender é a única forma de a área "Meus Pedidos" mostrar "em produção" como um estado real (e não um texto inventado só na camada de apresentação, que divergiria do que o admin efetivamente registra).

**Alternatives considered**: Mapear "em produção" apenas na camada de apresentação a partir de "pago" (sem mudar o enum) — rejeitado por criar um estado fantasma que o admin não consegue de fato selecionar/registrar, tornando a informação exibida ao cliente não confiável.

## 7. Histórico de endereços: derivado por leitura, sem coleção própria

**Decision**: O "histórico de endereços" do cliente é computado a partir dos endereços distintos já usados em `Pedido.cliente.endereco` nos pedidos associados à conta (mesma correspondência da Decisão 5), mais o endereço atual salvo no cadastro do cliente. Sem uma coleção `enderecos` separada.

**Rationale**: O requisito é só "ver" o histórico, não gerenciar endereços salvos para escolha ativa no checkout (fora de escopo, ver spec.md `## Assumptions`) — derivar por leitura evita duplicar dado que já existe nos pedidos.

**Alternatives considered**: Coleção `enderecos` vinculada ao cliente, com endereço marcado como "atual" — over-engineering para o que foi pedido; fica como possível evolução futura se o checkout vier a oferecer múltiplos endereços salvos.

## 8. Notificação ao admin: hook no upsert de pedido externo

**Decision**: `app/api/webhooks/mercado-livre/pedidos/route.ts` chama `notificarAdminVendaExterna(pedido)` sempre que `upsertPedidoExterno` retornar `criado: true` (mesmo ponto que hoje já dispara `abaterEstoquePedido`). O e-mail vai para `ADMIN_NOTIFICACAO_EMAIL` (env var), com canal, itens e valor do pedido.

**Rationale**: É exatamente o ponto que hoje distingue "primeira notificação real" de "reentrega idempotente do webhook" — reaproveitar evita mandar e-mail duplicado a cada reenvio do Mercado Livre.

**Alternatives considered**: Dedicar um Route Handler novo/cron que varre pedidos recentes de canal externo — desnecessário, o webhook já sabe exatamente quando uma venda nova foi sincronizada.

**Limitação descoberta na implementação (T027)**: `upsertPedidoExterno` (Tarefa 7/EDI-80, `lib/pedidos/externos.ts`) hoje sempre grava um e-mail placeholder fixo (`vendas-externas@voxelasduo.local`) para pedidos do Mercado Livre — o webhook (`app/api/webhooks/mercado-livre/pedidos/route.ts`) nunca passou `cliente` para `upsertPedidoExterno`, e `buscarPedidoMercadoLivre` (`lib/estoque/canais/mercadoLivre/pedidos.ts`) nunca buscou dados do comprador (só itens/quantidades). Além disso, a API de Orders do Mercado Livre normalmente não expõe o e-mail real do comprador (só `buyer.id`/`nickname`, por política de privacidade da plataforma) sem escopos adicionais não configurados nesta integração. **Consequência**: a associação automática por e-mail (FR-018/US4 AC3) funciona corretamente para pedidos de convidado do site (onde o e-mail real é sempre capturado no checkout), mas na prática não conecta pedidos do Mercado Livre a nenhuma conta de cliente hoje — eles continuam aparecendo apenas no painel administrativo, nunca em "Meus Pedidos", até que uma tarefa futura resolva a captura do e-mail real do comprador no Mercado Livre (fora do escopo do EDI-84). A query de `buscarPedidosDoCliente` (data-model.md) já está correta e pronta para quando isso existir — não precisa de nenhuma mudança adicional.

## 9b. `signIn`/`signOut` do cliente via Server Actions, não `next-auth/react`

**Decision**: Os formulários de login/cadastro/logout do cliente chamam `signIn`/`signOut` **exportados por `lib/auth/clienteConfig.ts`** através de Server Actions (`"use server"`), em vez dos helpers client-side de `next-auth/react` usados hoje pelo admin (`components/admin/LoginForm.tsx`, `SairButton.tsx`).

**Rationale**: Os helpers client-side (`signIn`/`signOut` de `next-auth/react`) resolvem a URL da API de autenticação a partir de um único `basePath` global no processo do navegador (configurado, quando necessário, por um `<SessionProvider basePath="...">` — mas o valor é compartilhado no client runtime, não isolado por árvore de componentes). Como o projeto agora tem **duas** instâncias do NextAuth com `basePath` diferentes (`/api/auth` do admin e `/api/auth/cliente` do cliente), usar os helpers client-side para o cliente arriscaria colidir com a configuração do admin (ou vice-versa) caso as duas árvores algum dia coexistam na mesma navegação client-side. Chamar o `signIn`/`signOut` já vinculado à instância certa (exportado pelo próprio `clienteConfig.ts`) via Server Action elimina essa ambiguidade — cada instância só é referenciada pelo módulo que a define, sem depender de nenhum estado global do navegador. Também é o padrão recomendado pelo próprio NextAuth v5 para Credentials (evita round-trip client-side desnecessário); para o provider Google (fluxo por redirect), funciona da mesma forma.

**Alternatives considered**: `next-auth/react` com `<SessionProvider basePath="/api/auth/cliente">` envolvendo `app/(loja)/layout.tsx` — tecnicamente possível, mas introduz uma configuração global compartilhada (o `basePath` efetivo no client runtime) cujo comportamento com duas instâncias simultâneas de NextAuth na mesma aplicação não está documentado como suportado; Server Actions evitam a incerteza por completo.

## 9c. `proxy.ts` usa `getToken` para checar a sessão do cliente, não um segundo `auth(...)` HOF

**Decision**: O `auth(...)` HOF do admin (`lib/auth/config.ts`) já ocupa o papel de handler default do `proxy.ts`. Para checar a sessão do cliente dentro do mesmo arquivo, usa-se `getToken` de `next-auth/jwt`, passando explicitamente `secret: process.env.AUTH_CLIENTE_SECRET` e `cookieName` (o mesmo nome customizado configurado em `clienteConfig.ts`).

**Rationale**: `auth(...)` como HOF é pensado para ser o único middleware default de um arquivo — aninhar duas instâncias diferentes desse HOF no mesmo `proxy.ts` não é um padrão documentado. `getToken` é a função de baixo nível oficial para ler/validar um JWT de sessão a partir de um `NextRequest` sem depender de qual instância "é a atual", eliminando qualquer ambiguidade entre as duas configurações.

## 9. Textos em PT-BR direto, sem biblioteca de i18n

**Decision**: Mesma decisão já registrada nas Tarefas 3/4 (`specs/003-carrinho-checkout/research.md` #7) — todo texto novo desta tarefa (telas de cadastro/login/recuperação/"Meus Pedidos", e-mails transacionais) é escrito diretamente em PT-BR, sem introduzir `next-intl` ou dicionários.

**Rationale**: Não há nenhuma biblioteca de i18n no projeto ainda; introduzi-la seria escopo não pedido nesta tarefa, e o padrão PT-BR direto é o único existente hoje no código.

**Alternatives considered**: Nenhuma nova — decisão já tomada e documentada anteriormente, apenas reafirmada aqui para as novas telas/e-mails.

## 11. Correções pós-implementação (feedback do usuário após o primeiro teste manual)

- **Verificação de e-mail obrigatória no cadastro por senha**: `Cliente` ganhou `emailVerificado: boolean` + `verificacaoEmail?` (mesmo formato de `recuperacaoSenha`, código de 6 dígitos, 10 minutos). `POST /api/clientes` não autentica mais direto — envia o código e redireciona para `/verificar-email`; `autorizarCredenciaisCliente` agora lança `ContaNaoVerificadaError` (subclasse de `CredentialsSignin`) quando a senha está certa mas o e-mail não foi confirmado, permitindo a UI orientar para `/verificar-email` em vez de mostrar "senha incorreta". Contas via Google (`criarOuUnificarClienteGoogle`) sempre gravam `emailVerificado: true`, inclusive ao unificar com uma conta de e-mail/senha ainda não verificada.
- **Import de `next-auth` quebra testes unitários**: qualquer `import ... from "next-auth"` (mesmo só para pegar a classe `AuthError`/`CredentialsSignin`) puxa `next-auth/lib/env.js`, que importa `next/server` de um jeito que o resolvedor do Vitest não suporta (`Cannot find module .../next/server`). Corrigido importando essas duas classes de `@auth/core/errors` (subpath exportado separadamente, sem essa cadeia) em `lib/auth/autorizarCredenciaisCliente.ts` e `lib/auth/clienteActions.ts`. `instanceof` continua funcionando normalmente porque `next-auth` apenas re-exporta as mesmas classes de `@auth/core`, não redefine.
- **Logout do cliente**: `sairCliente` (Server Action) já existia em `clienteActions.ts` mas nunca tinha um botão real na UI — corrigido com `components/cliente/SairClienteButton.tsx` (form com o Server Action), usado em `SiteHeader` (logado) e em `MinhaContaNav`.
- **Busca de endereço por CEP**: `lib/cep/buscarEnderecoPorCep.ts` chama ViaCEP (principal) e cai para BrasilAPI (fallback) se a primeira falhar/não encontrar — as duas são APIs públicas brasileiras sem autenticação, chamadas direto do navegador. O campo CEP foi movido para o primeiro campo de endereço em `FormularioCheckout.tsx` (checkout) e `FormularioDadosCadastrais.tsx` (meus dados), preenchendo rua/bairro/cidade/estado automaticamente ao completar 8 dígitos.
- **Bug de CSS corrigido**: a lista "endereços já usados" (`app/(loja)/minha-conta/page.tsx`) reaproveitava a classe `.subtitulo` (que tem `margin-top` negativo, pensada para um único parágrafo colado embaixo de um título) em cada `<li>`, fazendo os itens se sobreporem visualmente. Criadas `.enderecosLista`/`.enderecoItem` dedicadas em `cliente.module.css`.
