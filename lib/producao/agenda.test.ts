import { describe, expect, it } from "vitest";
import { horasEMinutos, inicioMaximo } from "./agenda";

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
