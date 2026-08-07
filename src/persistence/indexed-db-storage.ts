import type { DocumentStorage } from "./storage.js";

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promisifyTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/**
 * The real browser `DocumentStorage`: one IndexedDB object store holding
 * the whole document under a single fixed key.
 */
export class IndexedDbDocumentStorage<T> implements DocumentStorage<T> {
  private readonly documentKey = "root";
  private readonly databaseName: string;
  private readonly storeName: string;

  constructor(databaseName: string, storeName: string) {
    this.databaseName = databaseName;
    this.storeName = storeName;
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(this.storeName)) {
          request.result.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async load(): Promise<T | null> {
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(this.storeName, "readonly");
      const result = await promisifyRequest<T | undefined>(
        transaction.objectStore(this.storeName).get(this.documentKey),
      );
      return result ?? null;
    } finally {
      database.close();
    }
  }

  async save(value: T): Promise<void> {
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(this.storeName, "readwrite");
      transaction.objectStore(this.storeName).put(value, this.documentKey);
      await promisifyTransaction(transaction);
    } finally {
      database.close();
    }
  }

  async clear(): Promise<void> {
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(this.storeName, "readwrite");
      transaction.objectStore(this.storeName).clear();
      await promisifyTransaction(transaction);
    } finally {
      database.close();
    }
  }
}
