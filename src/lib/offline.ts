import { get, set, del } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/query-persist-client-core";

const CACHE_KEY = "riz-oftalmologia-query-cache";

/** Persistencia de React Query en IndexedDB para trabajar sin conexión. */
export function createIdbPersister(key: string = CACHE_KEY): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(key, client);
    },
    restoreClient: async () => await get<PersistedClient>(key),
    removeClient: async () => {
      await del(key);
    },
  };
}

export function useOnlineStatusListener(onOnline: () => void): () => void {
  window.addEventListener("online", onOnline);
  return () => window.removeEventListener("online", onOnline);
}
