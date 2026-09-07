export interface EnderecoPorCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface RespostaViaCep {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

interface RespostaBrasilApi {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

/**
 * Busca endereço por CEP (correção pós-EDI-84) — ViaCEP como fonte
 * principal, com BrasilAPI como fallback caso a primeira falhe ou o CEP não
 * seja encontrado nela. As duas são APIs públicas brasileiras sem
 * autenticação, chamadas direto do navegador (sem passar pelo nosso backend).
 * Retorna `null` quando nenhuma das duas encontra o CEP.
 */
export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoPorCep | null> {
  const digitos = cep.replace(/\D/g, "");
  if (digitos.length !== 8) {
    return null;
  }

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    if (resposta.ok) {
      const dados = (await resposta.json()) as RespostaViaCep;
      if (!dados.erro && dados.logradouro !== undefined) {
        return {
          logradouro: dados.logradouro ?? "",
          bairro: dados.bairro ?? "",
          cidade: dados.localidade ?? "",
          estado: dados.uf ?? "",
        };
      }
    }
  } catch {
    // Segue para o fallback.
  }

  try {
    const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${digitos}`);
    if (resposta.ok) {
      const dados = (await resposta.json()) as RespostaBrasilApi;
      return {
        logradouro: dados.street ?? "",
        bairro: dados.neighborhood ?? "",
        cidade: dados.city ?? "",
        estado: dados.state ?? "",
      };
    }
  } catch {
    // Nenhuma das duas encontrou — o cliente preenche manualmente.
  }

  return null;
}
