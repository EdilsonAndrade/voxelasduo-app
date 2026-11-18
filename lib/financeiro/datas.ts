/** Datas do financeiro no horário de Brasília (UTC−3, sem horário de verão). */
const OFFSET_MS = 3 * 60 * 60 * 1000;

/** `AAAA-MM-DD` → meio-dia em Brasília (não muda de dia em nenhum fuso do país). */
export function dataDoDia(texto: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const data = new Date(`${texto}T12:00:00-03:00`);
  if (Number.isNaN(data.getTime())) return null;
  // Rejeita 2026-02-31 e afins (o Date "rola" para o mês seguinte).
  return diaDe(data) === texto ? data : null;
}

/** Data → `AAAA-MM-DD` em Brasília. */
export function diaDe(data: Date): string {
  return new Date(data.getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

/** Data → `AAAA-MM` em Brasília. */
export function mesDe(data: Date): string {
  return diaDe(data).slice(0, 7);
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** `2026-11` → `nov/26` */
export function rotuloMes(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${MESES[Number(m) - 1]}/${ano.slice(2)}`;
}

/** Os `quantidade` meses terminando no mês de `agora`, do mais antigo ao atual. */
export function ultimosMeses(agora: Date, quantidade: number): string[] {
  const [ano, mes] = mesDe(agora).split("-").map(Number);
  const meses: string[] = [];
  for (let i = quantidade - 1; i >= 0; i -= 1) {
    const total = ano * 12 + (mes - 1) - i;
    meses.push(`${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`);
  }
  return meses;
}
