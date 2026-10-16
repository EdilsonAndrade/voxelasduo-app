# Contrato: leitura do G-code (cliente)

```ts
interface FilamentoLido { tipo: string; cor: string; pesoGramas: number }
interface MesaLida { indice: number; segundos: number; pesoGramas: number; objetos: number | null; filamentos: FilamentoLido[] }
interface GcodeLido { mesas: MesaLida[] }   // .gcode → 1 mesa

lerGcode(arquivo: File): Promise<GcodeLido>   // lança Error com mensagem em pt-BR
interpretarCabecalhoGcode(texto: string): MesaLida | null   // puro
interpretarSliceInfo(xml: string): MesaLida[]               // puro
segundosDeDuracao("1d 2h 3m 4s"): number                    // puro
```

Erros (mensagem na tela, campos não mudam):
- extensão diferente de `.gcode` / `.3mf` → "Envie um arquivo .gcode ou .gcode.3mf."
- `.3mf` sem `Metadata/slice_info.config` → "Esse .3mf não está fatiado. No Bambu Studio, exporte o arquivo fatiado (.gcode.3mf)."
- sem tempo nem peso encontrados → "Não encontrei tempo e peso nesse arquivo."
- compressão ZIP não suportada → "Formato de compactação não suportado."

Aplicação no formulário: tempo → horas + minutos; peças por mesa ← objetos (se houver); filamentos → uma linha por filamento (tipo, cor, peso), R$/kg do campo simples copiado para cada linha. Nenhum `fetch` é feito.

# Contrato: API (sem mudança de rota)

`POST /api/admin/calculos-preco` e `PUT /api/admin/calculos-preco/:id` aceitam `valores` com `canais` e `producao` objetos e **`custo` OU `impressao`** objeto (antes exigia `custo`). Erro 400 `{ erro }` mantido.
