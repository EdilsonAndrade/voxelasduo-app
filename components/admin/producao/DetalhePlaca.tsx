import styles from "./producao.module.css";

/**
 * Linha de apoio sob o nome da peça: placa, perfil de impressão e link do
 * modelo no MakerWorld. O perfil ("0.2mm layer, 2 walls...") não identifica a
 * peça, mas ajuda a distinguir duas placas do mesmo modelo.
 */
export default function DetalhePlaca({
  nomePlaca,
  nomePerfil,
  designId,
}: {
  nomePlaca?: string;
  nomePerfil?: string;
  designId?: string;
}) {
  const partes = [nomePlaca, nomePerfil].filter(Boolean);
  if (partes.length === 0 && !designId) return null;

  return (
    <span className={styles.detalhePlaca}>
      {partes.join(" · ")}
      {designId && (
        <>
          {partes.length > 0 && " · "}
          <a
            href={`https://makerworld.com/models/${encodeURIComponent(designId)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            ver no MakerWorld
          </a>
        </>
      )}
    </span>
  );
}
