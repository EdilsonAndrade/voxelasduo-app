<!-- SPECKIT START -->

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/006-integracao-mercado-livre/plan.md

## RULES

1. Always speak in Portugese in the chat
2. EVITE ao máximo detalhar muito, SOMENTE quando solicito ou não compreensivo pelo usuário
3. Não esconda erros que deveria ser mostrados na aba network

## GUARDRAILS

1. SEMPRE acesse o linear via MCP configurado no arquivo `./.mcp.json` quando mencionado algum numero de ticket, card, ou issue pelo usuário
2. SE houver dúvidas ou incertezas SEMPRE questionar.

## CRITICAL IMPLEMENTATION
1. SEMPRE INICIE ESTES PASSOS SEGUINDO ordem dos comandos não havendo duvidas
  1. /speckit-specify
  2. /speckit-plan
  3. /speckit-tasks
  4. /speckit-implement
4. O nome da branch sempre levará o NOME da ISSUE do Linear, se não houver, pergunte.
5. Sempre me passe o nome do commit seguindo os padrões do git flow e não commita so me passe o nome
7. CASO não haja ticket no linear, atuar pontualmente após entendimento
8. Não inicie o container, ou suba instancia para testar o site ou backend, sempre peça ao usuário para seguir conforme plano de Test Guide, não queria ler o navegador , exceto se solicitado
9. O projeto é multi-lingua, então sempre que for colocar textos, siga o padrão já existente I18N.

## Test Guide
1. At the end of all implementation, describe how to test following the example
<example>
1- Access the page XPTO
2- Click on menu YZ
3- Execute the SQL query to check
4- Run this curl to update or inser
</example>
<!-- SPECKIT END -->

## DESIGN E UI

1. SEMPRE que for criar ou alterar design/UI/páginas do site, invoque as skills abaixo (via Skill tool) antes de implementar:
   - `frontend-design` — direção visual (paleta, tipografia, layout), para qualquer tela nova ou redesenho
   - `product-page-design` — páginas de produto (galeria, variantes, prova social, CTA), para telas de PDP/vitrine de produtos 3D
   - `site-architecture` — estrutura de páginas, navegação e hierarquia, ao planejar novas seções/rotas do site
2. Essas skills estão em `~/.agents/skills` (nível de usuário, não no repo). Se não aparecerem na listagem de skills disponíveis, avisar o usuário em vez de improvisar o design.


