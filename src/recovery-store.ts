import { parseCorpusRecoverySnapshot, type CorpusRecoverySnapshot } from "../lib/corpus-recovery";

const DATABASE_NAME = "ivertim-corpus-local";
const STORE_NAME = "recovery";
const ACTIVE_KEY = "active-working-copy";

export async function loadCorpusRecovery(): Promise<CorpusRecoverySnapshot | null> {
  const database = await openDatabase();
  try {
    const value = await request(database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(ACTIVE_KEY));
    return value === undefined ? null : parseCorpusRecoverySnapshot(value);
  } finally {
    database.close();
  }
}

export async function saveCorpusRecovery(snapshot: CorpusRecoverySnapshot): Promise<void> {
  const database = await openDatabase();
  try {
    await transactionComplete(database.transaction(STORE_NAME, "readwrite"), (store) => store.put(snapshot, ACTIVE_KEY));
  } finally {
    database.close();
  }
}

export async function clearCorpusRecovery(): Promise<void> {
  const database = await openDatabase();
  try {
    await transactionComplete(database.transaction(STORE_NAME, "readwrite"), (store) => store.delete(ACTIVE_KEY));
  } finally {
    database.close();
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DATABASE_NAME, 1);
    opening.onupgradeneeded = () => {
      if (!opening.result.objectStoreNames.contains(STORE_NAME)) opening.result.createObjectStore(STORE_NAME);
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error ?? new Error("Lokalna baza oporavka nije dostupna."));
    opening.onblocked = () => reject(new Error("Lokalna baza oporavka je zauzeta u drugom tabu."));
  });
}

function request<T>(operation: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error ?? new Error("Lokalni zapis nije moguće pročitati."));
  });
}

function transactionComplete(transaction: IDBTransaction, mutate: (store: IDBObjectStore) => IDBRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    mutate(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Lokalni zapis nije moguće sačuvati."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Lokalno čuvanje je prekinuto."));
  });
}
