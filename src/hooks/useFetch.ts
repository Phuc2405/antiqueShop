import { useCallback, useEffect, useRef, useState, type DependencyList, type Dispatch, type SetStateAction } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AppError, toAppError } from '@/lib/errors';

export interface FetchState<T> {
  data: T | undefined;
  loading: boolean;
  error: AppError | null;
  reload: () => void;
  /** Cập nhật lạc quan (optimistic) sau khi thao tác thành công, không cần tải lại. */
  setData: Dispatch<SetStateAction<T | undefined>>;
}

/**
 * Hook đọc dữ liệu chung: loading / error / reload.
 * Response của lần gọi cũ về muộn sẽ bị bỏ qua (chống race khi deps đổi nhanh).
 * Truyền `enabled = false` để hoãn (vd: chưa có userId).
 */
export function useFetch<T>(fn: () => Promise<T>, deps: DependencyList, enabled = true): FetchState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<AppError | null>(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError(new AppError('NOT_CONFIGURED', 'Chưa kết nối Supabase — kiểm tra file .env.'));
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(toAppError(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload, setData };
}
