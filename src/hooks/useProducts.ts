import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { toAppError, type AppError } from '@/lib/errors';
import { productService, type ProductQuery } from '@/services/product.service';
import type { Product } from '@/types/domain';

interface State {
  items: Product[];
  total: number;
  loading: boolean;
  error: AppError | null;
}

/**
 * Fetch danh sách sản phẩm. Mỗi lần query đổi → huỷ request cũ (AbortController),
 * nên response về trễ không bao giờ ghi đè kết quả mới hơn.
 */
export function useProducts(query: Omit<ProductQuery, 'signal'> = {}) {
  const [state, setState] = useState<State>({ items: [], total: 0, loading: isSupabaseConfigured, error: null });
  const key = JSON.stringify(query);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    productService
      .list({ ...(JSON.parse(key) as ProductQuery), signal: ctrl.signal })
      .then(({ items, total }) => setState({ items, total, loading: false, error: null }))
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setState((s) => ({ ...s, loading: false, error: toAppError(err) }));
      });
    return () => ctrl.abort();
  }, [key]);

  return state;
}
