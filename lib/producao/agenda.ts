const MINUTOS_DIA = 24 * 60;

function minutosDe(horario: string): number | null {
  const [h, m] = horario.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  return h * 60 + m;
}

/**
 * Até que horas a placa pode começar para terminar em `horarioTermino`.
 *
 * `diasAntes` diz quantos dias antes do término é o início: uma placa de 10h
 * que termina às 07:30 começa às 21:30 da véspera (`diasAntes = 1`). Arredonda
 * para baixo no minuto — começar um minuto antes nunca atrasa o término.
 */
export function inicioMaximo(
  horarioTermino: string,
  duracaoSegundos: number
): { horario: string; diasAntes: number } | null {
  const termino = minutosDe(horarioTermino);
  if (termino === null || duracaoSegundos <= 0) return null;

  const inicio = termino - Math.ceil(duracaoSegundos / 60);
  const diasAntes = Math.max(0, Math.ceil(-inicio / MINUTOS_DIA));
  const noDia = inicio + diasAntes * MINUTOS_DIA;

  const hh = String(Math.floor(noDia / 60)).padStart(2, "0");
  const mm = String(noDia % 60).padStart(2, "0");
  return { horario: `${hh}:${mm}`, diasAntes };
}

/**
 * A que horas a placa termina se começar em `inicio` (specs/035).
 *
 * `diasDepois` diz em quantos dias depois do início ela termina: 10h02 a partir
 * das 22:00 termina às 08:02 do dia seguinte (`diasDepois = 1`).
 */
export function terminoPrevisto(
  inicio: string,
  minutos: number
): { horario: string; diasDepois: number } | null {
  const comeco = minutosDe(inicio);
  if (comeco === null || comeco < 0 || comeco >= MINUTOS_DIA || !(minutos > 0)) return null;

  const fim = comeco + Math.round(minutos);
  const diasDepois = Math.floor(fim / MINUTOS_DIA);
  const noDia = fim % MINUTOS_DIA;

  const hh = String(Math.floor(noDia / 60)).padStart(2, "0");
  const mm = String(noDia % 60).padStart(2, "0");
  return { horario: `${hh}:${mm}`, diasDepois };
}

/** "10h05" — mais legível que "10.08 h" quando a conta é de relógio. */
export function horasEMinutos(horas: number): string {
  const total = Math.round(horas * 60);
  return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, "0")}`;
}
