import { sairCliente } from "@/lib/auth/clienteActions";
import styles from "./cliente.module.css";

/** Server Component simples — o botão só precisa submeter o form vinculado ao Server Action (research.md #9b). */
export default function SairClienteButton({ className }: { className?: string }) {
  return (
    <form action={sairCliente} style={{ display: "inline" }}>
      <button type="submit" className={className ?? styles.linkBotao}>
        Sair
      </button>
    </form>
  );
}
