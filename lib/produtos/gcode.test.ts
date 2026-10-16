import { describe, expect, it } from "vitest";
import { interpretarCabecalhoGcode, interpretarSliceInfo, segundosDeDuracao } from "./gcode";

describe("segundosDeDuracao", () => {
  it("soma dias, horas, minutos e segundos", () => {
    expect(segundosDeDuracao("1d 2h 3m 4s")).toBe(93784);
    expect(segundosDeDuracao("35m 30s")).toBe(2130);
    expect(segundosDeDuracao("sem tempo")).toBe(0);
  });
});

describe("interpretarCabecalhoGcode", () => {
  it("Bambu Studio: tempo total e peso total", () => {
    const texto = [
      "; HEADER_BLOCK_START",
      "; BambuStudio 01.10.01.50",
      "; model printing time: 29m 6s; total estimated time: 1h 35m 30s",
      "; total filament weight [g] : 41.27",
      "; HEADER_BLOCK_END",
      "; filament_type = PLA",
      "; filament_colour = #FFFFFF",
    ].join("\n");
    expect(interpretarCabecalhoGcode(texto)).toEqual({
      indice: 1,
      segundos: 5730,
      pesoGramas: 41.27,
      objetos: null,
      filamentos: [{ tipo: "PLA", cor: "#FFFFFF", pesoGramas: 41.27 }],
    });
  });

  it("Orca: peso por filamento", () => {
    const texto = [
      "; estimated printing time (normal mode) = 2h 0m 0s",
      "; filament used [g] = 10.50, 2.25",
      "; filament_type = PLA;PETG",
      "; filament_colour = #000000;#FF0000",
    ].join("\n");
    const mesa = interpretarCabecalhoGcode(texto)!;
    expect(mesa.segundos).toBe(7200);
    expect(mesa.pesoGramas).toBe(12.75);
    expect(mesa.filamentos).toEqual([
      { tipo: "PLA", cor: "#000000", pesoGramas: 10.5 },
      { tipo: "PETG", cor: "#FF0000", pesoGramas: 2.25 },
    ]);
  });

  it("sem tempo nem peso = null", () => {
    expect(interpretarCabecalhoGcode("G1 X10 Y10\nG1 X20")).toBeNull();
  });
});

describe("interpretarSliceInfo", () => {
  it("uma mesa por <plate>, com objetos e filamentos", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <plate>
    <metadata key="index" value="1"/>
    <metadata key="prediction" value="5402"/>
    <metadata key="weight" value="41.20"/>
    <object identify_id="1" name="gato.stl" skipped="false" />
    <object identify_id="2" name="gato.stl" skipped="false" />
    <object identify_id="3" name="gato.stl" skipped="true" />
    <filament id="1" tray_info_idx="GFA00" type="PLA" color="#FFFFFF" used_m="12.1" used_g="36.20" />
    <filament id="2" type="PLA" color="#000000" used_m="1.6" used_g="5.00" />
  </plate>
  <plate>
    <metadata key="index" value="2"/>
    <metadata key="prediction" value="600"/>
    <metadata key="weight" value="3"/>
  </plate>
</config>`;
    const mesas = interpretarSliceInfo(xml);
    expect(mesas).toHaveLength(2);
    expect(mesas[0]).toEqual({
      indice: 1,
      segundos: 5402,
      pesoGramas: 41.2,
      objetos: 2,
      filamentos: [
        { tipo: "PLA", cor: "#FFFFFF", pesoGramas: 36.2 },
        { tipo: "PLA", cor: "#000000", pesoGramas: 5 },
      ],
    });
    expect(mesas[1]).toMatchObject({ indice: 2, segundos: 600, objetos: null, filamentos: [] });
  });
});
