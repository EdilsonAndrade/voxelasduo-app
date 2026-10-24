import { describe, expect, it } from "vitest";
import { horasEMinutos, inicioMaximo, terminoPrevisto } from "./agenda";

describe("inicioMaximo", () => {
  it("placa de 10h que termina às 07:30 começa às 21:30 da véspera", () => {
    expect(inicioMaximo("07:30", 10 * 3600)).toEqual({ horario: "21:30", diasAntes: 1 });
  });

  it("no mesmo dia quando cabe antes do término", () => {
    expect(inicioMaximo("18:00", 2.5 * 3600)).toEqual({ horario: "15:30", diasAntes: 0 });
  });

  it("arredonda o início para o minuto anterior", () => {
    expect(inicioMaximo("07:30", 3600 + 30)).toEqual({ horario: "06:29", diasAntes: 0 });
  });

  it("mais de um dia de impressão volta mais de um dia", () => {
    expect(inicioMaximo("07:30", 30 * 3600)).toEqual({ horario: "01:30", diasAntes: 1 });
    expect(inicioMaximo("07:30", 32 * 3600)).toEqual({ horario: "23:30", diasAntes: 2 });
  });

  it("sem duração não há o que calcular", () => {
    expect(inicioMaximo("07:30", 0)).toBeNull();
  });
});

describe("horasEMinutos", () => {
  it("formata em horas e minutos", () => {
    expect(horasEMinutos(4.83)).toBe("4h50");
    expect(horasEMinutos(10)).toBe("10h00");
  });
});

describe("terminoPrevisto", () => {
  it("termina no mesmo dia", () => {
    expect(terminoPrevisto("06:00", 222)).toEqual({ horario: "09:42", diasDepois: 0 });
  });

  it("10h02 a partir das 22:00 termina às 08:02 do dia seguinte", () => {
    expect(terminoPrevisto("22:00", 602)).toEqual({ horario: "08:02", diasDepois: 1 });
  });

  it("terminar exatamente à meia-noite já é o dia seguinte", () => {
    expect(terminoPrevisto("23:00", 60)).toEqual({ horario: "00:00", diasDepois: 1 });
  });

  it("impressões de mais de um dia somam os dias", () => {
    expect(terminoPrevisto("10:00", 50 * 60)).toEqual({ horario: "12:00", diasDepois: 2 });
  });

  it("início ou tempo inválidos não têm término", () => {
    expect(terminoPrevisto("", 60)).toBeNull();
    expect(terminoPrevisto("25:00", 60)).toBeNull();
    expect(terminoPrevisto("10:00", 0)).toBeNull();
  });
});
