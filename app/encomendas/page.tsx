import Image from "next/image";
import FormularioEncomenda from "@/components/encomendas/FormularioEncomenda";
import RainbowTitle from "@/components/produtos/RainbowTitle";
import produtosStyles from "@/components/produtos/produtos.module.css";
import styles from "@/components/encomendas/encomendas.module.css";

export const metadata = {
  title: "Encomendas sob medida — Voxelas Duo",
  description: "Também fazemos encomendas de impressão 3D: decoração, colecionáveis, presentes e peças personalizadas.",
};

export default function EncomendasPage() {
  return (
    <div className={`container ${styles.pagina}`}>
      <div className={produtosStyles.hero}>
        <p className={produtosStyles.eyebrow}>sob medida, do seu jeito</p>
        <RainbowTitle texto="Não achou? A gente imprime" />
      </div>

      <div className={styles.layout}>
        <div className={styles.coluna}>
          <div className={`${styles.palco} ${styles.palcoPoster}`}>
            <Image
              src="/images/encomendas.png"
              alt="Voxelas Duo — também fazemos encomendas de impressão 3D. WhatsApp (19) 98157-5723, site www.voxelasduo.com.br, e-mail voxelasduo@gmail.com"
              width={1254}
              height={1254}
              sizes="(max-width: 860px) 90vw, 460px"
              className={styles.poster}
              priority
            />
          </div>

          <ol className={styles.passos}>
            <li className={styles.passo}>
              <span className={styles.passoIcone} aria-hidden="true">1</span>
              <span>
                <strong>Você conta a ideia</strong>
                Preencha o formulário com o que imagina: tamanho, cores, para quem é.
              </span>
            </li>
            <li className={styles.passo}>
              <span className={styles.passoIcone} aria-hidden="true">2</span>
              <span>
                <strong>A gente responde</strong>
                Entramos em contato por e-mail ou WhatsApp com valor e prazo.
              </span>
            </li>
            <li className={styles.passo}>
              <span className={styles.passoIcone} aria-hidden="true">3</span>
              <span>
                <strong>Imprimimos e enviamos</strong>
                Combinado o pedido, sua ideia ganha forma e chega até você.
              </span>
            </li>
          </ol>
        </div>

        <FormularioEncomenda />
      </div>
    </div>
  );
}
