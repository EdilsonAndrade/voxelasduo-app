/**
 * A nuvem da Bambu Lab nem sempre devolve `material` como texto: em várias
 * respostas vem um objeto (`{ id: "", name: "" }` quando a placa não declara
 * filamento). Interpolar isso direto imprimia "[object Object]" na tela.
 *
 * Vive fora do mapeamento porque também é usado na **leitura**: as impressões
 * gravadas antes desta correção têm o objeto no banco, e a tela precisa
 * mostrá-las certas sem depender de uma reimportação da origem.
 */
export function textoDeMaterial(valor: unknown): string | undefined {
  if (typeof valor === "string") return valor.trim() || undefined;
  if (valor && typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    for (const chave of ["name", "type", "filamentType", "material"]) {
      const candidato = objeto[chave];
      if (typeof candidato === "string" && candidato.trim()) return candidato.trim();
    }
  }
  return undefined;
}
