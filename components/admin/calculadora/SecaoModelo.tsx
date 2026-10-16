"use client";

import styles from "../admin.module.css";
import calc from "../calculadoraRapida.module.css";
import { Campo, Divisor } from "./campos";
import Secao from "./Secao";

function Link({ id, rotulo, valor, onChange, placeholder, abrir }: { id: string; rotulo: string; valor: string; onChange: (v: string) => void; placeholder: string; abrir: string }) {
  const valido = /^https?:\/\/\S+$/.test(valor.trim());
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} type="url" value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {valido && (
        <a href={valor.trim()} target="_blank" rel="noopener noreferrer" className={styles.mlLinkAviso}>
          {abrir} ↗
        </a>
      )}
    </div>
  );
}

export default function SecaoModelo({
  nome,
  setNome,
  linkModelo,
  setLinkModelo,
  linkShopee,
  setLinkShopee,
  linkMercadoLivre,
  setLinkMercadoLivre,
  alturaCm,
  setAlturaCm,
}: {
  nome: string;
  setNome: (v: string) => void;
  linkModelo: string;
  setLinkModelo: (v: string) => void;
  linkShopee: string;
  setLinkShopee: (v: string) => void;
  linkMercadoLivre: string;
  setLinkMercadoLivre: (v: string) => void;
  alturaCm: string;
  setAlturaCm: (v: string) => void;
}) {
  return (
    <Secao icone="modelo" titulo="Modelo" resumo={nome.trim() || "sem nome"} aberta={nome.trim() === ""}>
      <div className={calc.campos2}>
        <div className={styles.field}>
          <label htmlFor="nomeRascunho">Nome do produto</label>
          <input id="nomeRascunho" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Vaso geométrico" />
        </div>
        <Campo id="altura" rotulo="Altura da peça (opcional)" unidade="cm" valor={alturaCm} onChange={setAlturaCm} dica="Para separar tamanhos: gato 5 cm, 10 cm…" />
      </div>
      <Divisor>Fonte do modelo</Divisor>
      <Link id="linkModelo" rotulo="Link do modelo (MakerWorld)" valor={linkModelo} onChange={setLinkModelo} placeholder="https://makerworld.com/..." abrir="Abrir modelo" />
      <Divisor>Mesmo produto nos marketplaces</Divisor>
      <div className={calc.campos2}>
        <Link id="linkShopee" rotulo="Na Shopee (opcional)" valor={linkShopee} onChange={setLinkShopee} placeholder="https://shopee.com.br/..." abrir="Abrir anúncio" />
        <Link
          id="linkMercadoLivre"
          rotulo="No Mercado Livre (opcional)"
          valor={linkMercadoLivre}
          onChange={setLinkMercadoLivre}
          placeholder="https://www.mercadolivre.com.br/..."
          abrir="Abrir anúncio"
        />
      </div>
    </Secao>
  );
}
