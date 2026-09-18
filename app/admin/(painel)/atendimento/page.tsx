import {
  listarMensagensPendentes,
  listarPerguntasPendentes,
  listarReclamacoesPendentes,
} from "@/lib/atendimento/repository";
import { paraItemMensagem, paraItemPergunta, paraItemReclamacao } from "@/lib/atendimento/apresentacao";
import { buscarProdutosPorIds, buscarPedidoPorId } from "@/lib/pedidos/repository";
import AtendimentoLista from "@/components/admin/AtendimentoLista";
import styles from "@/components/admin/admin.module.css";

// Sempre busca dados atuais — mesmo motivo de app/admin/produtos/page.tsx e app/admin/pedidos/page.tsx.
export const dynamic = "force-dynamic";

export default async function AdminAtendimentoPage() {
  const [perguntas, reclamacoes, mensagens] = await Promise.all([
    listarPerguntasPendentes(),
    listarReclamacoesPendentes(),
    listarMensagensPendentes(),
  ]);

  const produtos = await buscarProdutosPorIds(
    perguntas.filter((p) => p.produtoId).map((p) => p.produtoId!.toString())
  );

  const pedidosReclamacoes = await Promise.all(
    reclamacoes.filter((r) => r.pedidoId).map((r) => buscarPedidoPorId(r.pedidoId!.toString()))
  );
  const pedidosMensagens = await Promise.all(
    mensagens.filter((m) => m.pedidoId).map((m) => buscarPedidoPorId(m.pedidoId!.toString()))
  );

  let indiceReclamacaoComPedido = 0;
  let indiceMensagemComPedido = 0;

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Atendimento</h1>
      </div>

      <AtendimentoLista
        perguntas={perguntas.map((p) =>
          paraItemPergunta(p, p.produtoId ? (produtos.get(p.produtoId.toString()) ?? null) : null)
        )}
        reclamacoes={reclamacoes.map((r) =>
          paraItemReclamacao(r, r.pedidoId ? pedidosReclamacoes[indiceReclamacaoComPedido++] : null)
        )}
        mensagens={mensagens.map((m) =>
          paraItemMensagem(m, m.pedidoId ? pedidosMensagens[indiceMensagemComPedido++] : null)
        )}
      />
    </div>
  );
}
