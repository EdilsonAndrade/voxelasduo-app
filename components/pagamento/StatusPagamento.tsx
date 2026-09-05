import type { StatusTentativaPagamento } from "@/lib/models/pedido";
import styles from "./pagamento.module.css";

export interface ResultadoTentativa {
  status: StatusTentativaPagamento;
  metodo?: string;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
}

const TEXTOS: Record<StatusTentativaPagamento, { titulo: string; texto: string }> = {
  aprovado: {
    titulo: "pagamento aprovado! 🎉",
    texto: "atualizando a confirmação do seu pedido...",
  },
  recusado: {
    titulo: "pagamento recusado",
    texto: "o pagamento não foi aprovado. você pode tentar novamente com outro cartão ou via Pix.",
  },
  expirado: {
    titulo: "tempo esgotado",
    texto: "essa tentativa de pagamento expirou antes de ser concluída. tente novamente.",
  },
  pendente: {
    titulo: "pagamento em análise",
    texto: "estamos aguardando a confirmação. se for Pix, escaneie o QR code para concluir.",
  },
};

const CLASSE_POR_STATUS: Record<StatusTentativaPagamento, string> = {
  aprovado: styles.statusAprovado,
  recusado: styles.statusRecusado,
  expirado: styles.statusExpirado,
  pendente: styles.statusPendente,
};

interface StatusPagamentoProps {
  resultado: ResultadoTentativa;
  onTentarNovamente?: () => void;
}

export default function StatusPagamento({ resultado, onTentarNovamente }: StatusPagamentoProps) {
  const { titulo, texto } = TEXTOS[resultado.status];

  return (
    <div className={`${styles.statusCard} ${CLASSE_POR_STATUS[resultado.status]}`}>
      <p className={styles.statusTitulo}>{titulo}</p>
      <p className={styles.statusTexto}>{texto}</p>

      {resultado.status === "pendente" && resultado.qrCodeBase64 && (
        // eslint-disable-next-line @next/next/no-img-element -- imagem base64 gerada em tempo real pelo Mercado Pago
        <img
          className={styles.qrCode}
          src={`data:image/png;base64,${resultado.qrCodeBase64}`}
          alt="QR code para pagamento via Pix"
        />
      )}

      {onTentarNovamente && (resultado.status === "recusado" || resultado.status === "expirado") && (
        <button className={styles.botaoTentarNovamente} onClick={onTentarNovamente}>
          tentar novamente
        </button>
      )}
    </div>
  );
}
