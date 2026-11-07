# Data Model: Produto com variações de kit

## Produto (`produtos`) — campos novos

```ts
interface PecaVariacao {
  produtoId: string;
  quantidade: number;            // 1..999
  ultimo: { nome: string; custoCentavos: number | null }; // valores no momento do salvamento
}

interface VariacaoKit {
  id: string;                    // estável (hex aleatório), não muda ao editar
  nome: string;                  // 1..60, único no produto (sem diferenciar maiúsculas)
  pecas: PecaVariacao[];         // 1..30, sem produtoId repetido (soma quantidade)
  embalagemCentavos: number;     // >= 0
  preco: number;                 // centavos, > 0 — preço do site (já com desconto)
  precosCanais?: { shopee?: number; mercadoLivre?: number }; // referência, > 0 quando presentes
  estoque: number;               // inteiro >= 0
  foto?: string;                 // uma das URLs de produto.fotos; ausente/removida = fotos[0]
}

interface Produto {
  // ...
  variacoes?: VariacaoKit[];     // 0..10; ausente/vazio = produto simples
}
```

**Regras**
- Com `variacoes.length > 0`: `preco = min(variacoes.preco)` e `estoque = Σ variacoes.estoque`, gravados pelo servidor.
- Peça não pode ser o próprio produto, um produto com `variacoes` ou um produto com `kitId`.
- Remover todas as variações mantém o `preco`/`estoque` atuais do produto (o lojista ajusta no formulário).

## Item do pedido (`pedidos.itens[]`)

```ts
interface ItemPedido {
  produtoId: ObjectId;
  quantidade: number;
  precoUnitario: number;
  variacaoId?: string;   // presente quando o produto tinha variações
  variacaoNome?: string; // nome no momento da compra (exibido mesmo se a variação mudar)
}
```

## Item do carrinho (localStorage)

`ItemCarrinho` ganha `variacaoId?: string` e `variacaoNome?: string`. Chave da linha = `produtoId` + `:` + `variacaoId` (ou só `produtoId`).

## Cálculo de preço (`calculosPreco`)

`CalculoPreco.variacaoId?: string`: o cálculo se refere à variação `variacaoId` do produto `produtoId`.
