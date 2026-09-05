import { describe, expect, it } from "vitest";
import { mapearStatusMercadoPago } from "./status";

describe("mapearStatusMercadoPago", () => {
  it("mapeia 'approved' para 'aprovado'", () => {
    expect(mapearStatusMercadoPago("approved")).toBe("aprovado");
  });

  it("mapeia 'rejected' para 'recusado'", () => {
    expect(mapearStatusMercadoPago("rejected")).toBe("recusado");
  });

  it("mapeia 'cancelled' para 'expirado'", () => {
    expect(mapearStatusMercadoPago("cancelled")).toBe("expirado");
  });

  it("mapeia 'pending' para 'pendente'", () => {
    expect(mapearStatusMercadoPago("pending")).toBe("pendente");
  });

  it("mapeia 'in_process' para 'pendente'", () => {
    expect(mapearStatusMercadoPago("in_process")).toBe("pendente");
  });

  it("mapeia status desconhecido para 'pendente' (fallback seguro)", () => {
    expect(mapearStatusMercadoPago("qualquer_coisa_nova")).toBe("pendente");
  });
});
