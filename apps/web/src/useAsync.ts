import { useCallback, useEffect, useState } from 'react';
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fn().then((data) => setState({ data, loading: false }))
      .catch((e: unknown) => setState({ error: e instanceof Error ? e.message : String(e), loading: false }));
  }, deps);
  useEffect(run, [run]);
  return { ...state, reload: run };
}
