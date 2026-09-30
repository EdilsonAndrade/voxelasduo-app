import CategoriasLista from "@/components/admin/CategoriasLista";
import { listarCategoriasAdmin } from "@/lib/categorias/repository";
import styles from "@/components/admin/admin.module.css";
import categoriasStyles from "@/components/admin/categorias.module.css";

// Sempre dados atuais — sem isso a lista seria congelada no build.
export const dynamic = "force-dynamic";

export default async function AdminCategoriasPage() {
  const categorias = await listarCategoriasAdmin();

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Categorias do site</h1>
      </div>
      <p className={categoriasStyles.intro}>
        Agrupam os produtos na vitrine, na ordem abaixo. Renomear muda só o nome exibido, o endereço
        continua o mesmo. A categoria do anúncio no Mercado Livre é escolhida à parte, no cadastro do produto.
      </p>
      <CategoriasLista categoriasIniciais={categorias} />
    </div>
  );
}
