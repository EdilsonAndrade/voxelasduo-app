# Research: Painel administrativo de pedidos

## 1. Filtro e paginação em `GET /api/pedidos`

**Decision**: Estender a rota existente (`app/api/pedidos/route.ts`, hoje um esqueleto sem filtro da Tarefa 1) para aceitar query params `canal`, `status` e `pagina`, montando um filtro Mongo (`{ canalOrigem, status }`) e usando `skip`/`limit` (20 por página) sobre o índice `criadoEm: -1` já criado na Tarefa 3.

**Rationale**: O índice e a coleção já existem; não há necessidade de agregação nem de nova coleção. Volume esperado (dezenas de pedidos) não justifica cursor-based pagination.

**Alternatives considered**:
- **Agregação com `$facet` para contagem + página numa única query**: rejeitado por complexidade desnecessária no volume atual; duas queries simples (contagem e página) são suficientes e mais legíveis.
- **Carregar tudo no client e filtrar em JS**: rejeitado — não escala e expõe todos os pedidos no payload inicial sem necessidade.

## 2. Atualização manual de status

**Decision**: `PATCH /api/pedidos/[id]` aceita `{ status }` e grava diretamente (`status`, `atualizadoEm`), sem máquina de estados que bloqueie transições (ex: permite ir de "cancelado" de volta para "pago").

**Rationale**: Conforme FR-005/Assumptions do spec, quem opera é a própria administradora — o valor de uma máquina de estados rígida é baixo numa loja pequena e adicionaria fricção (ex: corrigir um status marcado errado). A UI já exige confirmação (`ConfirmModal`) antes de aplicar, o que cobre o risco de clique acidental.

**Alternatives considered**:
- **Máquina de estados com transições permitidas por status atual**: rejeitado nesta tarefa — pode ser adicionado depois se o histórico mostrar erros operacionais recorrentes; não é um requisito atual.

## 3. Canal Shopee sem integração (UI preparada)

**Decision**: A Shopee aparece como terceira opção no filtro de canal e como badge possível, mas: (a) nunca existe um pedido real com `canalOrigem: "shopee"` ainda — o filtro simplesmente retorna lista vazia; (b) a UI mostra um texto fixo tipo "Integração com a Shopee pendente de aprovação" quando esse filtro é selecionado, sem nenhuma chamada de rede adicional.

**Rationale**: Alinhado à nota registrada na issue EDI-81 (aprovação da Shopee Open Platform ainda pendente) e ao requisito explícito do usuário de "deixar preparado tela/botões". Como `Pedido.canalOrigem` já inclui `"shopee"` desde a Tarefa 7 (`lib/models/pedido.ts`), não é necessário alterar o modelo — só a camada de apresentação.

**Alternatives considered**:
- **Não mostrar a opção Shopee até a integração existir**: rejeitado — o usuário pediu explicitamente para deixar a tela/botões preparados para quando a aprovação sair.
- **Criar `lib/estoque/canais/shopee/` já agora, como stub**: rejeitado — não há nenhum comportamento de canal (auth, client) para justificar o módulo ainda; criar um diretório vazio/stub seria complexidade sem uso, é puramente uma opção de interface nesta tarefa.

## 4. Proteção de acesso à rota `/admin/pedidos`

**Decision**: A rota fica exposta do mesmo jeito que `/admin/produtos` está hoje — sem autenticação real — e o plano documenta essa lacuna como dependência da Tarefa 9/EDI-86 (Autenticação e proteção do painel administrativo), que ainda não foi implementada.

**Rationale**: Implementar autenticação aqui duplicaria/anteciparia o escopo formal da Tarefa 9, criando uma solução temporária que teria que ser substituída depois — mesma decisão já tomada para `/admin/produtos` na Tarefa 2 (ver `specs/002-catalogo-produtos/research.md`).

**Alternatives considered**:
- **Adicionar um gate de autenticação simples só para esta rota**: rejeitado — criaria dois padrões de proteção diferentes dentro do mesmo `/admin` até a Tarefa 9 unificar tudo.

## 5. Internacionalização (I18N) dos textos desta tarefa

**Decision**: Segue o mesmo padrão já adotado nas Tarefas 1-7 — textos em PT-BR direto nos componentes, sem introduzir `next-intl` ou biblioteca de i18n nesta tarefa (decisão original em `specs/002-catalogo-produtos/research.md` #5, ainda válida).

**Rationale**: Nenhuma tarefa do projeto até agora implementou i18n completo; introduzir um sistema novo apenas nesta tela expandiria escopo sem pedido explícito do usuário.

**Alternatives considered**:
- **Implementar `next-intl` agora**: rejeitado por expandir escopo além do ticket sem pedido explícito.
