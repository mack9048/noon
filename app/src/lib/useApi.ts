import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

/** Tiny data hook: GET a path, expose loading/error/reload and a local setter. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(path);
      if (alive.current) setData(res);
    } catch (e: any) {
      if (alive.current) setError(e?.message ?? 'Something went wrong');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [load]);

  return { data, setData, loading, error, reload: load };
}
