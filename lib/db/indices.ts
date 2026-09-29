/**
 * Cria os índices de uma coleção uma única vez por instância (idempotente no
 * MongoDB), sem memorizar falha: se a criação falhar — ex.: `not primary`
 * durante uma troca de primário no Atlas —, a promessa rejeitada é descartada
 * e a próxima chamada tenta de novo. Antes, a rejeição ficava em cache e
 * derrubava todas as requisições daquela instância até ela ser reciclada.
 */
export function criarGarantiaDeIndices(): (criar: () => Promise<unknown>) => Promise<void> {
  let garantia: Promise<void> | undefined;

  return (criar) => {
    garantia ??= criar().then(
      () => undefined,
      (erro: unknown) => {
        garantia = undefined;
        throw erro;
      }
    );
    return garantia;
  };
}
