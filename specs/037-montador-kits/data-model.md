# Data Model: Montador de kits

## Coleção `kits` (nova)

```ts
interface ValoresComponente {
  nome: string;
  precoCentavos: number;
  pesoGramas: number | null;
  tempoMinutos: number | null;
  /** Custo de produção sem embalagem; null = produto sem custo cadastrado. */
  custoCentavos: number | null;
}

interface ItemKit {
  produtoId: string;
  quantidade: number;            // inteiro 1..999
  /** Últimos valores conhecidos — exibidos se o produto for apagado. */
  ultimo: ValoresComponente;
}

interface ReferenciaPreco {
  somaAvulsaCentavos: number;
  custoCentavos: number;
  pesoGramas: number;
  tempoMinutos: number;
  /** Valores de cada componente quando o preço foi definido (por produtoId). */
  itens: Record<string, ValoresComponente & { quantidade: number }>;
  definidoEm: Date;
}

interface Kit {
  _id?: ObjectId;
  nome: string;                   // 1..120
  itens: ItemKit[];               // 0..30, produtoId único
  embalagemCentavos: number;      // >= 0, padrão = VAZIO_CUSTO_PRODUCAO.custoEmbalagemReais
  faixasDesconto: number[];       // 1..5 valores, 0 < d < 100, padrão [10, 15, 20]
  precoCentavos: number | null;   // null = ainda sem preço
  referencia?: ReferenciaPreco;   // presente sempre que precoCentavos != null
  produtoId?: string;             // produto gerado do kit
  criadoEm: Date;
  atualizadoEm: Date;
}
```

## `Produto` (existente) — campo novo

```ts
/** Produto gerado pelo Montador de kits (specs/037) — não pode ser componente de kit. */
kitId?: string;
```

## Derivados (puros, não persistidos)

- `ComponenteAtual` = `ValoresComponente` lido do produto + `removido: boolean`.
- `TotaisKit` = soma avulsa, custo (itens × qtd + embalagem), peso, tempo, flags `pesoIncompleto`/`tempoIncompleto`/`custoIncompleto`.
- `SugestaoFaixa` = { descontoPercentual, precoCentavos, economiaCentavos, canais: [{ canal, comissaoCentavos, lucroCentavos, margemPercentual, bloqueada }] }.
- `Desatualizacao` = lista de { produtoId, nome, campo: "preco" | "peso" | "tempo" | "custo" | "removido" | "incluido" | "retirado", antes, depois }.

## Regras de validação

- `nome` obrigatório (trim), ≤ 120.
- Item: `produtoId` válido, existe, sem `kitId`; quantidade inteira 1..999; sem repetição.
- Item novo (só na requisição): `nome` obrigatório, `pesoGramas` > 0, `tempoMinutos` > 0 inteiro, `precoCentavos` > 0.
- `faixasDesconto`: 1..5, cada 0 < d < 100.
- `precoCentavos`: inteiro > 0 ou null; preço exige ao menos 1 item.
- Criar produto / levar para a calculadora exige ≥ 1 item e preço definido.

## Transições

```
sem preço ──escolher faixa/preço──▶ precificado ──componente muda──▶ desatualizado
     ▲                                   │  ▲                              │
     └──────────remover itens────────────┘  └──────reconfirmar preço───────┘
precificado ──criar produto──▶ com produto (kit.produtoId, produto.kitId)
```
