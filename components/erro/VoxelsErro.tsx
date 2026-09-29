import styles from "./PaginaErro.module.css";

/** Aresta do cubo isométrico no viewBox (200×200). */
const ARESTA = 40;

/** Faces de um cubo isométrico cujo vértice de cima está em (x, y). */
function faces(x: number, y: number) {
  const s = ARESTA;
  return {
    topo: `${x},${y} ${x + s},${y + s / 2} ${x},${y + s} ${x - s},${y + s / 2}`,
    esquerda: `${x - s},${y + s / 2} ${x},${y + s} ${x},${y + 2 * s} ${x - s},${y + 1.5 * s}`,
    direita: `${x},${y + s} ${x + s},${y + s / 2} ${x + s},${y + 1.5 * s} ${x},${y + 2 * s}`,
  };
}

function Cubo({ x, y, cor, className }: { x: number; y: number; cor: string; className?: string }) {
  const f = faces(x, y);
  return (
    <g className={className} style={{ fill: cor }}>
      <polygon points={f.topo} />
      <polygon points={f.esquerda} />
      <polygon points={f.esquerda} className={styles.sombraClara} />
      <polygon points={f.direita} />
      <polygon points={f.direita} className={styles.sombraEscura} />
    </g>
  );
}

function CuboContorno({ x, y }: { x: number; y: number }) {
  const f = faces(x, y);
  return (
    <g className={styles.cuboContorno}>
      <polygon points={f.topo} />
      <polygon points={f.esquerda} />
      <polygon points={f.direita} />
    </g>
  );
}

/**
 * Pilha de voxels — o motivo do logo. "falha": a camada de cima saiu do lugar
 * (layer shift, a falha clássica de impressão 3D). "vazio": falta a peça de
 * cima, só o contorno tracejado de onde ela estaria.
 */
export default function VoxelsErro({ variante }: { variante: "falha" | "vazio" }) {
  return (
    <svg className={styles.voxels} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <ellipse cx="100" cy="186" rx="62" ry="9" className={styles.mesa} />
      <Cubo x={100} y={110} cor="var(--laranja)" />
      <Cubo x={100} y={70} cor={variante === "falha" ? "var(--rosa)" : "var(--turquesa)"} />
      {variante === "falha" ? (
        <Cubo x={116} y={30} cor="var(--roxo)" className={styles.camadaDeslocada} />
      ) : (
        <CuboContorno x={100} y={30} />
      )}
    </svg>
  );
}
