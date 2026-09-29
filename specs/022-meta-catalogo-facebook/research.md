# Research: Catálogo da Meta (Facebook/Instagram Shop) — EDI-109

## 1. Formato do feed

- **Decision**: CSV (RFC 4180, UTF-8, separador vírgula, campos entre aspas quando contêm vírgula/aspas/quebra de linha), servido com `Content-Type: text/csv; charset=utf-8`.
- **Rationale**: É o formato mais simples aceito pelo "feed programado" do Commerce Manager, fácil de inspecionar no navegador/planilha e sem dependência nova (gerado por uma função pura). XML (RSS/Atom) também é aceito, mas não traz ganho aqui.
- **Alternatives considered**: XML RSS (mais verboso, precisa de escape de XML); Catalog Batch API em tempo real (exige app Meta, token de sistema e revisão de permissões — fora de escopo, fase futura).

## 2. Colunas do feed (especificação de dados de catálogo da Meta, produtos online)

| Coluna | Origem | Regra |
|--------|--------|-------|
| `id` | `_id` do produto (hex) | Estável enquanto o produto existir, mesmo se nome/slug/categoria mudarem |
| `title` | `metaCatalogo.titulo` → `nome` | Máx. 200 caracteres (Meta); truncado no feed se o do site passar |
| `description` | `metaCatalogo.descricao` → `descricao` → `nome` | Máx. 9.999 caracteres; texto puro |
| `availability` | `estoque` | `in stock` se > 0, senão `out of stock` |
| `condition` | fixo | `new` |
| `price` | `preco` (centavos) | `"39.90 BRL"` — ponto decimal, 2 casas, código ISO |
| `link` | base do site + `/produtos/{categoria}/{slug}` | Absoluto; segmentos com `encodeURIComponent` (mesmo padrão do carrinho) |
| `image_link` | `fotos[0]` | Absoluto (Vercel Blob já retorna URL absoluta; relativo recebe a base do site) |
| `additional_image_link` | `fotos[1..]` | Até 20 URLs, separadas por vírgula dentro do mesmo campo |
| `brand` | fixo | `VoxelasDuo` |
| `product_type` | `categoria` | Texto livre (ajuda a organizar conjuntos no catálogo) |

- `google_product_category`/`fb_product_category`: opcionais, omitidos (a Meta infere).
- Limites de texto: título até 200 (a Meta recomenda até ~65 para exibição), descrição até 9.999.

## 3. URL base do site

- **Decision**: extrair a resolução `process.env.SITE_URL || "https://www.voxelasduo.com.br"` (hoje privada em `lib/email/templates.ts`) para um helper compartilhado `lib/site/url.ts` (`urlBaseSite()`), reutilizado pelo e-mail e pelo feed.
- **Rationale**: `VERCEL_URL` aponta para o deploy protegido (mesmo motivo já documentado no e-mail); o link do feed precisa ser o domínio público.
- **Alternatives considered**: usar o host da requisição (a Meta chamaria pelo domínio cadastrado, mas previews/local gerariam links errados).

## 4. Rota pública e autenticação

- **Decision**: `GET /api/feeds/meta` — fora do `matcher` do `proxy.ts` (que cobre `/api/produtos/*`, `/api/admin/*` etc.), portanto público. `export const dynamic = "force-dynamic"` e `Cache-Control: no-store`.
- **Rationale**: A Meta busca o feed sem sessão; o conteúdo é apenas informação já pública do site. Sempre dados atuais (FR-012).
- **Alternatives considered**: token na query string (proteção fraca e desnecessária para dados públicos); cache/ISR (arriscaria servir preço desatualizado; volume baixo não justifica).

## 5. Falha ao gerar o feed

- **Decision**: qualquer exceção → `500` com JSON `{ erro }`, nunca CSV vazio.
- **Rationale**: A Meta mantém o catálogo anterior quando a busca falha; um CSV vazio válido apagaria todos os itens (edge case da spec, FR-010). Também mantém o erro visível na aba Network (regra 3 do CLAUDE.md).

## 6. Onde guardar a marcação e os textos próprios

- **Decision**: novo campo de topo `Produto.metaCatalogo?: { publicar: boolean; titulo?: string; descricao?: string }`.
- **Rationale**: Não misturar em `integracoes` — o form envia `integracoes` inteiro e o PATCH faz `$set` do objeto; um campo separado evita acoplamento e deixa claro que não há ID de anúncio externo (a Meta não devolve ID; o id do item é o do próprio produto). Aditivo e opcional: produtos existentes continuam válidos (ausente = não publicado).
- **Alternatives considered**: `integracoes.metaPublicar` (acoplado ao ciclo de ML/Shopee); coleção separada (desnecessário).

## 7. Produto sem foto

- **Decision**: validação já exige ≥ 1 foto no cadastro/edição; adicionalmente o gerador do feed ignora defensivamente itens sem foto (a Meta rejeitaria o item) e a validação de `metaCatalogo` não precisa de regra extra.
- **Rationale**: FR-008 já é garantido pela regra existente de `fotos`; evitar regra duplicada.

## 8. i18n

- **Decision**: sem biblioteca de i18n no projeto (confirmado por busca: nenhum `next-intl`/`useTranslations`); textos novos inline em pt-BR, igual ao restante do admin (mesma decisão do EDI-108).

## 9. Duplicar produto

- **Decision**: `produtoParaDuplicar` copia os textos próprios do Facebook, mas volta `publicar` para `false` (a cópia nasce sem fotos, e o vendedor decide publicar).
