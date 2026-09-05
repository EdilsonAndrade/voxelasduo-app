"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import StatusPagamento, { type ResultadoTentativa } from "./StatusPagamento";
import styles from "./pagamento.module.css";

interface PagamentoBrickProps {
  pedidoId: string;
  valorTotalCentavos: number;
}

export default function PagamentoBrick({ pedidoId, valorTotalCentavos }: PagamentoBrickProps) {
  const router = useRouter();
  const inicializado = useRef(false);
  const [resultado, setResultado] = useState<ResultadoTentativa | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [chaveBrick, setChaveBrick] = useState(0);

  useEffect(() => {
    if (inicializado.current) return;
    inicializado.current = true;
    initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!, { locale: "pt-BR" });
  }, []);

  async function handleSubmit({ formData }: { formData: unknown }) {
    setErroEnvio(null);

    const resposta = await fetch("/api/pagamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedidoId, formData }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      // 409 (tentativa em andamento/pedido já pago) ou 400/502 — exibido acima do Brick.
      setErroEnvio(dados.erro ?? "Não foi possível processar o pagamento. Tente novamente.");
      throw new Error(dados.erro ?? "Falha ao processar pagamento");
    }

    const novoResultado: ResultadoTentativa = {
      status: dados.tentativa.status,
      metodo: dados.tentativa.metodo,
      qrCode: dados.tentativa.detalhes?.qrCode ?? null,
      qrCodeBase64: dados.tentativa.detalhes?.qrCodeBase64 ?? null,
    };
    setResultado(novoResultado);

    if (novoResultado.status === "aprovado") {
      // O backend já promoveu o pedido a "pago" de forma síncrona — recarrega
      // a página (Server Component) para mostrar a confirmação atualizada.
      router.refresh();
    }
  }

  function tentarNovamente() {
    setResultado(null);
    setErroEnvio(null);
    setChaveBrick((chave) => chave + 1);
  }

  if (resultado) {
    return (
      <StatusPagamento
        resultado={resultado}
        onTentarNovamente={resultado.status === "aprovado" ? undefined : tentarNovamente}
      />
    );
  }

  return (
    <div className={styles.brickContainer}>
      <p className={styles.seloSeguranca}>🔒 pagamento processado com segurança pelo Mercado Pago</p>
      {erroEnvio && <p className={styles.statusTexto}>{erroEnvio}</p>}
      <Payment
        key={chaveBrick}
        initialization={{ amount: valorTotalCentavos / 100 }}
        customization={{
          paymentMethods: {
            creditCard: "all",
            bankTransfer: "all",
            types: {
              excluded: ["debitCard", "ticket", "atm", "prepaidCard", "wallet_purchase", "onboarding_credits"],
            },
          },
        }}
        onSubmit={handleSubmit}
        onError={(erroBrick) => console.error("Erro no Payment Brick:", erroBrick)}
      />
    </div>
  );
}
