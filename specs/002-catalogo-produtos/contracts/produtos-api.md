# Contrato: API de Produtos

Base path: `/api/produtos`. Todas as respostas em JSON. Substitui/estende o esqueleto criado na Tarefa 1 (`app/api/produtos/route.ts`, atualmente só GET simples).

## `GET /api/produtos`

Lista produtos públicos, com busca e filtro opcionais.

**Query params**:
- `q` (opcional): termo de busca — corresponde a `nome` ou `descricao` (case-insensitive).
- `categoria` (opcional): filtra por categoria exata.

**Resposta 200**:
```json
{
  "produtos": [
    {
      "id": "665f1...",
      "nome": "Vaso Voronoi",
      "slug": "vaso-voronoi",
      "preco": 4990,
      "categoria": "decoracao",
      "fotoPrincipal": "https://.../vaso-voronoi-1.jpg",
      "estoque": 3
    }
  ]
}
```

Se nenhum produto corresponder, retorna `{ "produtos": [] }` (FR-011 é tratado na UI, não como erro de API).

## `POST /api/produtos`

Cria um novo produto. Usado pelo formulário `/admin/produtos/novo`.

**Body**:
```json
{
  "nome": "Vaso Voronoi",
  "descricao": "Vaso decorativo impresso em 3D, padrão voronoi.",
  "preco": 4990,
  "estoque": 10,
  "categoria": "decoracao",
  "fotos": ["https://.../vaso-voronoi-1.jpg"]
}
```

**Respostas**:
- `201`: produto criado, corpo com o documento completo (incluindo `id` e `slug` gerado).
- `400`: payload inválido (campo obrigatório ausente, `preco <= 0`, `estoque < 0`, `fotos` vazio) — corpo com `{ "erro": "...", "campos": { ... } }` detalhando o problema por campo (FR-002).

## `GET /api/produtos/[id]`

Retorna um produto por id (uso administrativo — carregar formulário de edição).

- `200`: documento completo do produto.
- `404`: produto não existe.

## `PATCH /api/produtos/[id]`

Atualiza campos de um produto existente. Body: subconjunto de campos do produto (mesma validação de `POST` aplicada aos campos enviados). Se `nome` mudar, `slug` é regenerado e revalidado quanto à unicidade.

- `200`: documento atualizado.
- `400`: payload inválido.
- `404`: produto não existe.

## `DELETE /api/produtos/[id]`

Remove um produto e as fotos associadas no Vercel Blob.

- `204`: removido com sucesso.
- `404`: produto não existe.

## `POST /api/produtos/upload`

Recebe um arquivo de imagem (`multipart/form-data`, campo `arquivo`) e retorna a URL pública após enviar ao Vercel Blob.

**Respostas**:
- `200`: `{ "url": "https://.../nome-do-arquivo.jpg" }`
- `400`: formato não suportado (aceita apenas `image/jpeg`, `image/png`, `image/webp`) ou arquivo maior que 5MB — corpo com `{ "erro": "..." }` (FR-003).

## Páginas públicas (Server Components — sem contrato JSON, listadas por completude)

- `GET /produtos` — usa os mesmos query params (`q`, `categoria`) da API acima para renderizar a listagem (FR-006, FR-009, FR-010, FR-011).
- `GET /produtos/[categoria]` — listagem pré-filtrada pela categoria da URL.
- `GET /produtos/[categoria]/[slug]` — detalhe do produto; renderiza página "não encontrado" (FR-012) se a busca por `categoria` + `slug` não retornar produto.
