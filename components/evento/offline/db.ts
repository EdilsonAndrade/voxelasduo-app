/**
 * Wrapper mínimo de IndexedDB para a área de pedidos de evento (EDI-125).
 * Guarda no aparelho a fila de envio (com as fotos), o rascunho do
 * formulário e o cache da última lista — sobrevive a fechar o navegador.
 */
const NOME_BANCO = "voxelas-evento";
const VERSAO = 1;

export type Store = "fila" | "rascunho" | "cache";

let conexao: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  conexao ??= new Promise<IDBDatabase>((resolve, reject) => {
    const pedido = indexedDB.open(NOME_BANCO, VERSAO);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains("fila")) db.createObjectStore("fila", { keyPath: "id" });
      if (!db.objectStoreNames.contains("rascunho")) db.createObjectStore("rascunho");
      if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache");
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => {
      conexao = null;
      reject(pedido.error);
    };
  });
  return conexao;
}

function executar<T>(store: Store, modo: IDBTransactionMode, acao: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return abrir().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transacao = db.transaction(store, modo);
        const requisicao = acao(transacao.objectStore(store));
        transacao.oncomplete = () => resolve(requisicao.result as T);
        // QuotaExceededError (aparelho cheio) chega aqui — quem chama mostra a mensagem.
        transacao.onerror = () => reject(transacao.error ?? requisicao.error);
        transacao.onabort = () => reject(transacao.error ?? new Error("Operação cancelada no armazenamento do aparelho."));
      })
  );
}

export function lerDb<T>(store: Store, chave: IDBValidKey): Promise<T | undefined> {
  return executar<T | undefined>(store, "readonly", (s) => s.get(chave));
}

export function listarDb<T>(store: Store): Promise<T[]> {
  return executar<T[]>(store, "readonly", (s) => s.getAll());
}

export function gravarDb(store: Store, valor: unknown, chave?: IDBValidKey): Promise<IDBValidKey> {
  return executar<IDBValidKey>(store, "readwrite", (s) => (chave === undefined ? s.put(valor) : s.put(valor, chave)));
}

export function apagarDb(store: Store, chave: IDBValidKey): Promise<undefined> {
  return executar<undefined>(store, "readwrite", (s) => s.delete(chave));
}
