import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/cn';
import { toAppError } from '@/lib/errors';
import { isSupabaseConfigured } from '@/lib/supabase';
import { likeService } from '@/services/like.service';
import { useAuthStore, selectUserId } from '@/stores/auth.store';
import { toast } from '@/stores/toast.store';
import { useRequireAuth } from '@/hooks/useRequireAuth';

/** Nút "Thương" (like): optimistic, khách chưa đăng nhập → Auth Modal. */
export function LikeButton({ productId, initialCount }: { productId: string; initialCount: number }) {
  const userId = useAuthStore(selectUserId);
  const requireAuth = useRequireAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const busy = useRef(false);

  useEffect(() => setCount(initialCount), [initialCount]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return setLiked(false);
    let alive = true;
    likeService
      .isLiked(productId, userId)
      .then((v) => alive && setLiked(v))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [productId, userId]);

  const toggle = () =>
    requireAuth(async () => {
      if (busy.current || !userId) return;
      busy.current = true;
      const next = !liked;
      setLiked(next);
      setCount((c) => Math.max(0, c + (next ? 1 : -1)));
      try {
        await (next ? likeService.like(productId, userId) : likeService.unlike(productId, userId));
        setCount(await likeService.count(productId)); // lấy số thật do trigger DB tính
      } catch (err) {
        setLiked(!next);
        setCount((c) => Math.max(0, c + (next ? -1 : 1)));
        toast.error(toAppError(err).message);
      } finally {
        busy.current = false;
      }
    });

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      className={cn(
        'inline-flex h-12 items-center gap-2 border px-4 transition-colors',
        liked ? 'border-oxblood/60 text-oxblood' : 'border-surface-line text-ink-soft hover:border-oxblood/60 hover:text-oxblood',
      )}
    >
      <motion.span key={String(liked)} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
        <Heart className={cn('h-5 w-5', liked && 'fill-oxblood')} strokeWidth={1.75} aria-hidden />
      </motion.span>
      <span className="text-sm">
        {liked ? 'Đã thương' : 'Thương'} · <span className="tabular-nums">{count}</span>
      </span>
    </button>
  );
}
