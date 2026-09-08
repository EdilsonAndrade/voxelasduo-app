# Contract: POST /api/mercado-livre/simular-preco

Nova rota interna (Next.js API route) usada pelo formulário de cadastro/edição de produto (`ProdutoForm.tsx` / `SimuladorPrecificacao.tsx`) para obter a comissão real de venda do Mercado Livre para um preço/categoria ainda não necessariamente salvos.

## Request

```
POST /api/mercado-livre/simular-preco
Content-Type: application/json
```

```jsonc
{
  "nome": "Vaso Decorativo Articulado",   // obrigatório — nome do produto, usado pelo previsor de categoria quando não há override
  "categoria": "decoracao",                // obrigatório — categoria do site (mesma usada em Produto.categoria)
  "precoReais": 73.05                       // obrigatório — preço de venda digitado, em reais (número > 0)
}
```

Validação de entrada:
- `nome`: string não vazia.
- `categoria`: string não vazia.
- `precoReais`: número finito e `> 0`. Valores `<= 0` ou não numéricos retornam `400` sem consultar o Mercado Livre (FR-012).

## Response — sucesso (200)

```jsonc
{
  "categoryId": "MLB43132",
  "listingTypeId": "gold_special",
  "listingFeeAmountCentavos": 0,
  "saleFeeAmountCentavos": 1131,
  "percentageFee": 15.5,
  "fixedFeeCentavos": 0
}
```

## Response — categoria não encontrada (404)

```jsonc
{
  "erro": "categoria_nao_encontrada",
  "mensagem": "Não foi possível determinar uma categoria do Mercado Livre para essa combinação de nome/categoria."
}
```

Uso esperado no cliente: exibir aviso não bloqueante (FR-006/FR-011) e permitir que o vendedor prossiga sem a simulação de comissão, ou informe a comissão manualmente.

## Response — falha de comunicação com o Mercado Livre (502)

```jsonc
{
  "erro": "falha_mercado_livre",
  "mensagem": "Não foi possível consultar a comissão no Mercado Livre no momento."
}
```

Mesma UX esperada do caso 404: aviso não bloqueante, formulário continua utilizável.

## Response — entrada inválida (400)

```jsonc
{
  "erro": "entrada_invalida",
  "campos": { "precoReais": "O preço deve ser maior que zero." }
}
```

## Notas de implementação

- A rota resolve a categoria com a mesma lógica de `criarAnuncio()` (`resolverCategoriaMercadoLivre` → fallback `preverCategoriaMercadoLivre`), garantindo que a simulação reflita a categoria que seria usada numa publicação real.
- Usa `listing_type_id=gold_special` fixo (mesmo valor usado na publicação — `anuncios.ts`), sem parâmetros de logística nesta primeira versão (ver research.md #3).
- Autenticação com o Mercado Livre é interna (token do vendedor/aplicação via `obterAccessTokenValido()`), não repassada pelo cliente — a rota não expõe nem exige credenciais do Mercado Livre no payload.
- Debounce (não disparar a cada tecla) é responsabilidade do cliente (`SimuladorPrecificacao.tsx`), não desta rota.
