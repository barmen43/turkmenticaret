import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 1 week (offline cache)
      staleTime: 1000 * 60 * 5, // 5 minutes before background refetch
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 3,
      networkMode: 'offlineFirst', // Allows queries to resolve from cache when offline
    },
    mutations: {
      networkMode: 'offlineFirst',
    }
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      try {
        const val = await get(key);
        return val ? val : null;
      } catch (err) {
        console.warn('IndexedDB getItem error:', err);
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        await set(key, value);
      } catch (err) {
        console.warn('IndexedDB setItem error:', err);
      }
    },
    removeItem: async (key) => {
      try {
        await del(key);
      } catch (err) {
        console.warn('IndexedDB removeItem error:', err);
      }
    },
  },
});
