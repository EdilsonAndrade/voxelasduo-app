# Phase 0 Research: E-mail de confirmação de pedido e padronização visual dos e-mails transacionais

## 1. Onde disparar o e-mail de confirmação (gatilho único e idempotente)

**Decision**: Disparar em `promoverPedidoSeAprovado` (`lib/pagamentos/repository.ts`), logo após `abaterEstoquePedido(pedidoPromovido)`, dentro do `if (pedidoPromovido)`.

**Rationale**: Essa função já é o único ponto que promove um `Pedido` para `status: "pago"`, chamada tanto por `registrarTentativa` (resposta síncrona do checkout, comum em cartão à vista aprovado na hora) quanto por `atualizarStatusTentativa` (webhook assíncrono do Mercado Pago, comum em Pix). O `findOneAndUpdate({ _id, status: { $ne: "pago" } })` só retorna o documento quando *esta chamada* foi de fato quem mudou o status — chamadas repetidas (reprocessamento do mesmo webhook, ou webhook chegando depois da resposta síncrona já ter promovido o pedido) retornam `null` e não re-executam o bloco. Reaproveitar essa condição para o e-mail dá a mesma garantia de "no máximo uma vez" já usada para o abatimento de estoque (FR-004/SC-002), sem precisar de um campo novo tipo `confirmacaoEnviadaEm`.

**Alternatives considered**:
- *Disparar em `app/api/pedidos/route.ts` (criação do pedido)*: rejeitado — nesse ponto o pedido está `"pendente"`, o pagamento ainda não foi aprovado (viola FR-006); compra por Pix criaria expectativa de confirmação antes da aprovação real.
- *Disparar em `app/api/pagamentos/webhook/route.ts`*: rejeitado — não cobre o caso comum de aprovação síncrona (cartão à vista), que promove o pedido antes de qualquer webhook chegar; duplicaria lógica de "só uma vez" que `promoverPedidoSeAprovado` já resolve.
- *Campo próprio de idempotência (`confirmacaoEnviadaEm`)*: rejeitado por ser redundante — o `findOneAndUpdate` condicional já existente entrega a mesma garantia sem migração de schema.

## 2. Pedidos de canal externo (Mercado Livre) ficam fora do escopo

**Decision**: Nenhuma mudança necessária para excluir pedidos externos — eles nunca passam por `promoverPedidoSeAprovado` (o fluxo do webhook do Mercado Livre chama `abaterEstoquePedido` e `notificarAdminVendaExterna` diretamente, sem tocar em `lib/pagamentos/repository.ts`).

**Rationale**: Confirma FR-007 "de graça", pela própria topologia do código já existente — não é preciso um `if (pedido.canalOrigem === "site")` defensivo.

**Alternatives considered**: N/A — nenhuma mudança de código motivada por este ponto.

## 3. Resolução dos nomes dos itens para o corpo do e-mail

**Decision**: `enviarConfirmacaoPedido(pedido: Pedido)` resolve os nomes internamente chamando `buscarProdutosPorIds` (já exportado de `lib/pedidos/repository.ts`), no mesmo padrão já usado por `app/pedido/[id]/page.tsx` para montar o resumo do pedido na tela de confirmação.

**Rationale**: Mantém a assinatura simples (só `Pedido`, igual a `notificarAdminVendaExterna(pedido)` já existente) e evita que o chamador (`promoverPedidoSeAprovado`) precise buscar produtos por conta própria. `ItemPedido` grava só `produtoId`/`quantidade`/`precoUnitario` — o nome do produto não é persistido no pedido (snapshot só de preço), então precisa ser buscado à parte.

**Alternatives considered**: Persistir o nome do produto no próprio `ItemPedido` no momento da compra — rejeitado por ser uma mudança de schema não pedida por esta tarefa e desnecessária (o produto pode ter sido removido/renomeado depois, mas isso já é uma limitação aceita hoje na tela de confirmação, que mostra `"Produto"` como fallback).

## 4. Falha no envio nunca bloqueia a compra (FR-005)

**Decision**: `enviarConfirmacaoPedido` segue exatamente o mesmo padrão *best-effort* já usado pelas três funções existentes em `lib/email/resend.ts`: `try/catch` interno, erro só logado (`console.error`), nunca lança. `promoverPedidoSeAprovado` chama com `await` (sem `.catch()` extra) porque a própria função de envio já garante que nunca rejeita.

**Rationale**: Mesmo tratamento já auditado e testado para `notificarAdminVendaExterna`, que roda no mesmo tipo de contexto (pós-aprovação, side-effect não crítico). Regra "não esconda erros que deveriam ser mostrados na aba network" (CLAUDE.md) não se aplica aqui pela mesma razão já documentada no contrato da Tarefa 10: é um envio assíncrono, best-effort por natureza, que não faz parte da resposta HTTP que o comprador ou o Mercado Pago está aguardando.

**Alternatives considered**: Fila/retry (ex.: reenviar depois de falha) — fora de escopo (spec.md `## Assumptions`: reenvio manual não faz parte desta tarefa).

## 5. Identidade visual do e-mail: HTML com tabelas + estilos inline

**Decision**: Layout HTML baseado em tabelas (`<table>`/`<td>`), com estilos inline em cada elemento (não um `<style>` de bloco único), usando a paleta de `specs/002-catalogo-produtos/design-tokens.md`: fundo `--creme` (`#FFF6ED`), destaque/CTA `--roxo` (`#7B5CF6`), texto `--preto` (`#111111`), cartão de conteúdo `--surface` branco com borda `--surface-line` (`#F0E4D3`). Tipografia: pilha de fontes do sistema com fallback (`'Nunito', 'Segoe UI', Helvetica, Arial, sans-serif` no corpo; título em peso 800 imitando o `Baloo 2` do site, já que fontes customizadas via `@font-face`/Google Fonts têm suporte inconsistente em clientes de e-mail — Nunito/Baloo 2 são carregadas via `<link>` do Google Fonts só como *progressive enhancement*, sem depender delas). Todas as quatro mensagens (confirmação de pedido, recuperação de senha, verificação de cadastro, notificação ao admin) compartilham o mesmo cabeçalho (logo + faixa colorida) e rodapé (aviso de "não responda" + copyright), variando só o título/corpo.

**Rationale**: Tabelas + inline styles é o padrão de tolerância entre clientes de e-mail (Gmail, Outlook desktop/web, Apple Mail) — Outlook desktop em particular usa o motor de renderização do Word e ignora boa parte do CSS moderno (flexbox/grid, `<style>` em `<head>` é removido por alguns webmails). Não há necessidade de uma biblioteca dedicada (`@react-email/components`, `mjml`) para quatro templates simples e já centralizados em `templates.ts` — introduzir uma dependência nova para isso seria escopo além do pedido.

**Alternatives considered**:
- `@react-email/components` ou MJML: rejeitados por serem dependências novas não pedidas, para um volume de templates (4) que não justifica a curva de setup.
- CSS flexbox/grid moderno: rejeitado — quebra em Outlook desktop (Word engine).

## 6. URL absoluta da logo (nova variável de ambiente)

**Decision**: Nova variável `SITE_URL` (ex.: `https://voxelasduo.com` em produção), usada só no servidor para montar `${SITE_URL}/images/logo.png`. Em desenvolvimento local, sem `SITE_URL` configurada, cai para `https://${process.env.VERCEL_URL}` (variável que a Vercel injeta automaticamente em toda build/preview) e, na ausência de ambas, omite a tag de imagem da logo (o e-mail continua funcional, só sem a imagem — nunca lança erro por causa disso).

**Rationale**: E-mails são renderizados fora do site, então uma referência relativa (`/images/logo.png`, usada normalmente no `<Image>` do Next.js) não resolve — precisa ser uma URL pública absoluta. `VERCEL_URL` como fallback evita exigir configuração manual em cada preview deployment; `SITE_URL` explícita permite apontar para o domínio customizado de produção em vez da URL interna `*.vercel.app`.

**Alternatives considered**: Incorporar a logo como anexo `inline` (`content-id`) no e-mail — rejeitado por ser mais complexo (precisa ler o arquivo do disco/bundle em toda função de envio) sem ganho relevante, já que a maioria dos clientes de e-mail hoje carrega imagens remotas por padrão (ou mostra um placeholder clicável "mostrar imagens", aceitável para um e-mail transacional que já tem o essencial em texto).

## 7. Textos em PT-BR direto, sem biblioteca de i18n

**Decision**: Mesma decisão já registrada nas Tarefas 3/4/10 (`specs/003-carrinho-checkout/research.md` #7, `specs/009-auth-painel-comprador/research.md` #9) — todo texto novo desta tarefa é escrito diretamente em PT-BR, sem introduzir `next-intl` ou dicionários.

**Rationale**: Reafirmação da decisão já tomada — não há biblioteca de i18n no projeto, e introduzi-la seria escopo não pedido nesta tarefa.

**Alternatives considered**: Nenhuma nova.
