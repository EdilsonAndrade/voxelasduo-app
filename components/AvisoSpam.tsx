import styles from "./AvisoSpam.module.css";

/** Aviso destacado nas telas que dependem de um e-mail: parte dos clientes relatou receber na pasta de spam. */
export default function AvisoSpam() {
  return (
    <div className={styles.aviso} role="note">
      <svg className={styles.icone} viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path
          d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Zm2.2-.3 6.8 5.1 6.8-5.1a.5.5 0 0 0-.3-.2h-13a.5.5 0 0 0-.3.2Zm13.8 2.3-6.4 4.8a1 1 0 0 1-1.2 0L5 8.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9Z"
          fill="currentColor"
        />
      </svg>
      <div>
        <p className={styles.titulo}>Não chegou? Olhe o Spam ou o Lixo eletrônico</p>
        <p className={styles.texto}>
          Nosso e-mail pode cair nessas pastas. Se estiver lá, clique em <strong>&ldquo;Não é spam&rdquo;</strong> para
          receber os próximos avisos na caixa de entrada.
        </p>
      </div>
    </div>
  );
}
