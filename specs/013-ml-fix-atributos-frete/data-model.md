# Data Model: Correções urgentes de atributos e frete nos anúncios do Mercado Livre

## Produto (extensão do modelo existente)

Arquivo: `lib/models/produto.ts`. Adiciona um campo opcional `embalagemEnvio` — opcional porque produtos já cadastrados hoje não têm esse dado, e FR-007 exige que a ausência não bloqueie a publicação.

```ts
/** Peso e dimensões da embalagem pronta para envio — distinto do "peso da peça" (EDI-92), inclui proteção/caixa (EDI-96). */
export interface EmbalagemEnvio {
  /** Peso da embalagem pronta para envio, em gramas. */
  pesoGramas: number;
  /** Altura da embalagem, em centímetros. */
  alturaCm: number;
  /** Largura da embalagem, em centímetros. */
  larguraCm: number;
  /** Comprimento da embalagem, em centímetros. */
  comprimentoCm: number;
}

export interface Produto {
  // ...campos existentes inalterados (incluindo custoProducao da EDI-92)...
  /** Dados de embalagem para cálculo de frete no Mercado Livre — ausente = ainda não configurado (EDI-96). */
  embalagemEnvio?: EmbalagemEnvio;
}
```

**Validação** (estende `lib/produtos/validation.ts`): quando `embalagemEnvio` está presente no payload, todos os seus campos são obrigatórios e devem ser números finitos `> 0` (FR-008). Igual ao padrão já usado para `custoProducao`, o campo continua opcional no payload — sua ausência não é erro.

## Atributo de Anúncio (não persistido)

Já existe como `AtributoItem` em `lib/estoque/canais/mercadoLivre/atributos.ts` — reaproveitado sem mudança de forma:

```ts
export interface AtributoItem {
  id: string;
  value_id?: string;
  value_name?: string;
}
```

`atributosEmbalagem(embalagem: EmbalagemEnvio): AtributoItem[]` (nova função) constrói os 4 atributos de embalagem (`SELLER_PACKAGE_WEIGHT/HEIGHT/LENGTH/WIDTH`) nesse formato, a partir de `EmbalagemEnvio`.

**Relações**: `EmbalagemEnvio` pertence a exatamente um `Produto` (1:1, embutido no documento). Nenhuma nova coleção é criada.
