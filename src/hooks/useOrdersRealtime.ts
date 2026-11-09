import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Nghe thay đổi bảng orders (Supabase Realtime, đã bật trong migration 0001).
 * RLS vẫn áp dụng: chỉ staff nhận được sự kiện của mọi đơn.
 */
export function useOrdersRealtime(onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel('orders-staff')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => cb.current(), 400); // gộp nhiều sự kiện liên tiếp
      })
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, []);
}
