# Design Tokens: Voxelas Duo

**Revisado em**: brand kit oficial fornecido pelo usuário (`public/images/cores.jpeg`, `public/images/logo.jpeg`) — substitui a proposta anterior (creme/navy/pastel), que era um mockup de conceito ainda não alinhado à marca real.

## Tema

- **Padrão fixo: claro.** Não seguir `prefers-color-scheme` do sistema — tema inicial sempre claro, com toggle (☀️/🌙) persistido em `localStorage` (`voxelas-theme`).

## Cor (paleta oficial da marca)

| Token | Claro | Escuro |
|---|---|---|
| `--laranja` | `#FF7A00` | `#FF9A3D` |
| `--rosa` | `#FF5BAE` | `#FF7EC2` |
| `--roxo` | `#7B5CF6` | `#9B87FF` |
| `--turquesa` | `#31D0C6` | `#4FE0D4` |
| `--amarelo` | `#FFD24D` | `#FFDB70` |
| `--preto` (texto) | `#111111` | `#FFF6ED` |
| `--creme` (fundo) | `#FFF6ED` | `#151217` |
| `--surface` (cards) | `#FFFFFF` | `#1F1B22` |
| `--surface-line` (bordas) | `#F0E4D3` | `#332C38` |

Cor de destaque principal (CTA, preço, links): **roxo** `#7B5CF6`. Rosa/laranja/turquesa/amarelo usados como acentos rotativos (categorias, tags, ícones), nunca todos ao mesmo tempo no mesmo elemento — energia controlada, não caótica.

## Tipografia

"Lemon Milk Bold" e "Lemon Tuesday" (do brand kit) são fontes comerciais, não disponíveis via Google Fonts. Substitutas livres com a mesma personalidade:

- **Display** (títulos, preços em destaque): `Baloo 2` — bold, arredondada, amigável; ecoa o peso e o clima de "Lemon Milk Bold".
- **Corpo** (parágrafos, formulários, textos longos): `Nunito` — redondinha, legível, combina com o Baloo 2 sem competir.
- **Apoio decorativo** (pequenas notas, rótulos tipo "feito com amor por duas irmãs", nunca parágrafos longos): `Caveat` (handwriting) — ecoa "Lemon Tuesday".

## Elemento de assinatura

- **Título multicolor**: no nome da marca e em destaques pontuais, cada palavra/sílaba pode herdar uma cor da paleta em sequência (laranja → rosa → roxo → turquesa → amarelo), ecoando o logo oficial ("voXelas" com letras coloridas). Usar com moderação — 1 título por tela, não em todo texto.
- **Voxels/cubos isométricos** (já usados no logo) seguem como motivo de marcador de categoria/estoque, agora nas cores vibrantes da paleta em vez de pastel.
- **Toques manuscritos** (`Caveat`) em pequenas frases de apoio, nunca em conteúdo funcional (preço, estoque, formulários).

## Marca aplicada

- **Logo**: `public/images/logo.jpeg` no header do site (público e admin) e como favicon do Next.js.
- **Dados de demonstração**: catálogo populado com produtos mock (script de seed) para haver conteúdo visível desde já.

## Onde aplicar

- `app/globals.css`: tokens acima + fontes.
- `app/layout.tsx`: favicon (via `metadata.icons`) apontando para o logo.
- Header (público e admin): logo + wordmark.
- Demais páginas: mesma paleta/tipografia já estruturada nesta tarefa (cards, ficha técnica, formulários), só trocando os tokens de cor/fonte.
