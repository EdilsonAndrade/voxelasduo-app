/**
 * Interpretação do G-code fatiado (Bambu Studio / Orca) — funções puras, sem
 * leitura de arquivo. A leitura do `File` no navegador fica em `lerGcode.ts`.
 */

export interface FilamentoLido {
  tipo: string;
  /** Cor em hex (#RRGGBB) ou vazio. */
  cor: string;
  pesoGramas: number;
}

export interface MesaLida {
  indice: number;
  segundos: number;
  pesoGramas: number;
  /** Objetos na mesa (sugestão de peças por mesa) — `null` = o arquivo não informa. */
  objetos: number | null;
  filamentos: FilamentoLido[];
}

/** "1d 2h 3m 4s" (ou partes dele) → segundos. Sem nenhuma parte reconhecida = 0. */
export function segundosDeDuracao(texto: string): number {
  const unidades: Record<string, number> = { d: 86400, h: 3600, m: 60, s: 1 };
  let total = 0;
  for (const [, valor, unidade] of texto.matchAll(/(\d+(?:\.\d+)?)\s*([dhms])(?![a-z])/gi)) {
    total += Number(valor) * unidades[unidade.toLowerCase()];
  }
  return Math.round(total);
}

function valorDaLinha(texto: string, padrao: RegExp): string | null {
  const achado = texto.match(padrao);
  return achado ? achado[1].trim() : null;
}

function lista(valor: string | null, separador: RegExp): string[] {
  return valor ? valor.split(separador).map((v) => v.trim().replace(/^"|"$/g, "")) : [];
}

/**
 * Lê o cabeçalho e o bloco de configuração (comentários `;`) de um `.gcode`.
 * Tempo: `total estimated time` (Bambu) ou `estimated printing time (normal mode)` (Orca/Prusa).
 * Peso: `filament used [g]` por filamento, senão `total filament weight [g]`.
 * `null` = não achou nem tempo nem peso.
 */
export function interpretarCabecalhoGcode(texto: string): MesaLida | null {
  const tempo =
    valorDaLinha(texto, /total estimated time:\s*([^;\r\n]+)/i) ??
    valorDaLinha(texto, /estimated printing time \(normal mode\)\s*=\s*([^\r\n]+)/i) ??
    valorDaLinha(texto, /model printing time:\s*([^;\r\n]+)/i);
  const segundos = tempo ? segundosDeDuracao(tempo) : 0;

  const pesos = lista(valorDaLinha(texto, /;\s*filament used \[g\]\s*=\s*([^\r\n]+)/i), /,/)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  const total = Number(valorDaLinha(texto, /total filament weight \[g\]\s*:\s*([\d.]+)/i) ?? NaN);
  const pesoGramas = pesos.length > 0 ? pesos.reduce((t, n) => t + n, 0) : Number.isFinite(total) ? total : 0;

  if (!(segundos > 0) && !(pesoGramas > 0)) return null;

  const tipos = lista(valorDaLinha(texto, /;\s*filament_type\s*=\s*([^\r\n]+)/i), /;/);
  const cores = lista(valorDaLinha(texto, /;\s*filament_colou?r\s*=\s*([^\r\n]+)/i), /;/);
  const porFilamento = pesos.length > 0 ? pesos : [pesoGramas];
  const filamentos = porFilamento
    .map((g, i) => ({ tipo: tipos[i] ?? tipos[0] ?? "", cor: cores[i] ?? "", pesoGramas: Math.round(g * 100) / 100 }))
    .filter((f) => f.pesoGramas > 0);

  return { indice: 1, segundos, pesoGramas: Math.round(pesoGramas * 100) / 100, objetos: null, filamentos };
}

function atributo(tag: string, nome: string): string | null {
  const achado = tag.match(new RegExp(`\\b${nome}="([^"]*)"`));
  return achado ? achado[1] : null;
}

/**
 * Lê `Metadata/slice_info.config` de um `.gcode.3mf`: uma mesa por `<plate>`,
 * com `prediction` (segundos), `weight` (g), os `<object>` não pulados e os
 * `<filament>` usados.
 */
export function interpretarSliceInfo(xml: string): MesaLida[] {
  const mesas: MesaLida[] = [];
  for (const [, corpo] of xml.matchAll(/<plate>([\s\S]*?)<\/plate>/g)) {
    const meta = (chave: string) => {
      const tag = corpo.match(new RegExp(`<metadata[^>]*key="${chave}"[^>]*/?>`));
      return tag ? atributo(tag[0], "value") : null;
    };
    const objetos = [...corpo.matchAll(/<object\b[^>]*>/g)].filter((m) => atributo(m[0], "skipped") !== "true").length;
    const filamentos = [...corpo.matchAll(/<filament\b[^>]*>/g)]
      .map((m) => ({
        tipo: atributo(m[0], "type") ?? "",
        cor: atributo(m[0], "color") ?? "",
        pesoGramas: Math.round(Number(atributo(m[0], "used_g") ?? 0) * 100) / 100,
      }))
      .filter((f) => f.pesoGramas > 0);
    const pesoInformado = Number(meta("weight") ?? NaN);
    mesas.push({
      indice: Number(meta("index") ?? mesas.length + 1),
      segundos: Math.round(Number(meta("prediction") ?? 0)),
      pesoGramas: Number.isFinite(pesoInformado)
        ? pesoInformado
        : Math.round(filamentos.reduce((t, f) => t + f.pesoGramas, 0) * 100) / 100,
      objetos: objetos > 0 ? objetos : null,
      filamentos,
    });
  }
  return mesas.filter((m) => m.segundos > 0 || m.pesoGramas > 0);
}
