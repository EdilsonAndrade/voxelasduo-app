# Data Model: Banners e destaques da home

Coleção **`secoesHome`** (MongoDB), com índice `{ ordem: 1 }` e índice `{ tipo: 1, produtoIds: 1 }`.

```ts
type TipoSecaoHome = "bannerHero" | "bannerIntermediario" | "textoDestaque" | "carrossel";
type AlinhamentoHorizontal = "esquerda" | "centro" | "direita";
type AlinhamentoVertical = "topo" | "meio" | "base";

interface BotaoSecao { texto: string; link: string }        // ambos obrigatórios quando o botão existe

interface SecaoHomeBase {
  _id?: ObjectId;
  tipo: TipoSecaoHome;
  ativa: boolean;
  ordem: number;            // 0..n; home ordena ASC
  criadoEm: Date;
  atualizadoEm: Date;
}

interface SecaoBanner extends SecaoHomeBase {
  tipo: "bannerHero" | "bannerIntermediario";
  imagemDesktop: string;    // URL Blob — obrigatória
  imagemMobile?: string;    // ausente = usa imagemDesktop
  titulo?: string;          // ≤ 80
  subtitulo?: string;       // ≤ 160
  texto?: string;           // ≤ 300
  botao?: BotaoSecao;       // texto ≤ 30; link interno "/..." ou "https://..."
  alinhamentoHorizontal: AlinhamentoHorizontal;  // padrão "esquerda"
  alinhamentoVertical: AlinhamentoVertical;      // padrão "base"
}

interface SecaoTextoDestaque extends SecaoHomeBase {
  tipo: "textoDestaque";
  titulo: string;           // obrigatório, ≤ 80
  texto?: string;           // ≤ 300
  botao?: BotaoSecao;
}

interface SecaoCarrossel extends SecaoHomeBase {
  tipo: "carrossel";
  titulo: string;           // obrigatório, ≤ 80 (ex.: "Favoritos dos clientes")
  linkVerTudo?: string;     // mesmo formato de link
  limite: number;           // 4..24, padrão 12
  produtoIds: ObjectId[];   // ordem = ordem de exibição
}

type SecaoHome = SecaoBanner | SecaoTextoDestaque | SecaoCarrossel;
```

## Regras
- Uma seção nova recebe `ordem = max(ordem) + 1` e nasce `ativa: false`, para o admin revisar antes de publicar.
- Um banner só pode ser **ativado** com `imagemDesktop`.
- `produtoIds` não tem duplicatas. Marcar um produto já marcado é idempotente.
- Excluir uma seção remove o documento. Os produtos não são tocados.
- Excluir um produto faz `$pull` de `produtoIds` em todos os carrosséis.

## Transições
`inativa ⇄ ativa` (PUT com `ativa`). Não há outros estados.

## Leitura pública (home)
`secoesPublicas()`: seções `ativa: true` ordenadas por `ordem`. Para carrosséis, carrega os produtos por `$in`, reordena conforme `produtoIds`, descarta os inexistentes e corta em `limite`. Seções sem conteúdo renderizável (carrossel vazio) são omitidas.
