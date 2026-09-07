import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/clienteConfig";
import { buscarClientePorId } from "@/lib/clientes/repository";
import { buscarPedidosDoCliente, derivarHistoricoEnderecos } from "@/lib/clientes/pedidosAssociados";
import FormularioDadosCadastrais from "@/components/cliente/FormularioDadosCadastrais";
import MinhaContaNav from "@/components/cliente/MinhaContaNav";
import styles from "@/components/cliente/cliente.module.css";

export const metadata = { title: "Meus dados — Voxelas Duo" };

export default async function MinhaContaPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar?callbackUrl=/minha-conta");
  }

  const cliente = await buscarClientePorId(session.user.id);
  if (!cliente) {
    redirect("/entrar?callbackUrl=/minha-conta");
  }

  const pedidos = await buscarPedidosDoCliente(cliente);
  const historicoEnderecos = derivarHistoricoEnderecos(cliente, pedidos);

  return (
    <div className={styles.paginaConta}>
      <MinhaContaNav ativo="dados" />
      <h1 className={styles.titulo}>Meus dados</h1>
      <FormularioDadosCadastrais telefoneInicial={cliente.telefone} enderecoInicial={cliente.endereco} />

      {historicoEnderecos.length > 0 && (
        <>
          <p className={styles.eyebrow} style={{ marginTop: "2rem" }}>
            endereços já usados
          </p>
          <ul className={styles.enderecosLista}>
            {historicoEnderecos.map((endereco, indice) => (
              <li key={indice} className={styles.enderecoItem}>
                {endereco.logradouro}, {endereco.numero}
                {endereco.complemento ? ` - ${endereco.complemento}` : ""} — {endereco.bairro},{" "}
                {endereco.cidade}/{endereco.estado} — {endereco.cep}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
