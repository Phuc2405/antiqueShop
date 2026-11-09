import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { authService } from '@/services/auth.service';
import { toast } from '@/stores/toast.store';
import type { Profile } from '@/types/domain';

type AuthStatus = 'idle' | 'loading' | 'ready';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  init: () => () => void;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: Profile) => void;
  signOut: () => Promise<void>;
}

/** Bộ đếm "thế hệ": response profile cũ về muộn sẽ bị bỏ qua (chống race khi đổi tài khoản nhanh). */
let generation = 0;

export const useAuthStore = create<AuthState>()((set, get) => {
  const loadProfile = async (session: Session | null) => {
    const gen = ++generation;
    if (!session) {
      set({ session: null, profile: null, status: 'ready' });
      return;
    }
    set({ session });
    try {
      const profile = await authService.getProfile(session.user.id);
      if (gen !== generation) return;
      // Tài khoản bị khoá: đăng xuất ngay (DB cũng đã chặn mọi thao tác ghi qua RLS/trigger).
      if (profile?.is_blocked) {
        toast.error('Tài khoản của bạn đang bị khoá. Vui lòng liên hệ cửa hàng.');
        await supabase.auth.signOut();
        return;
      }
      set({ profile, status: 'ready' });
    } catch (err) {
      console.error('[auth] load profile failed', err);
      if (gen === generation) set({ profile: null, status: 'ready' });
    }
  };

  return {
    status: 'idle',
    session: null,
    profile: null,

    init: () => {
      if (!isSupabaseConfigured) {
        set({ status: 'ready' });
        return () => {};
      }
      set({ status: 'loading' });
      // onAuthStateChange phát INITIAL_SESSION ngay khi đăng ký → không cần getSession() riêng.
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          set({ session });
          return;
        }
        // Không await Supabase call trực tiếp trong callback (có thể deadlock auth lock) → defer.
        setTimeout(() => void loadProfile(session), 0);
      });
      return () => data.subscription.unsubscribe();
    },

    refreshProfile: () => loadProfile(get().session),
    setProfile: (profile) => set({ profile }),

    signOut: async () => {
      await authService.signOut();
    },
  };
});

type S = Pick<AuthState, 'profile' | 'session'>;
export const selectIsAuthed = (s: S) => Boolean(s.session);
export const selectIsStaff = (s: S) => s.profile?.role === 'admin' || s.profile?.role === 'seller';
export const selectIsAdmin = (s: S) => s.profile?.role === 'admin';
export const selectUserId = (s: S) => s.session?.user.id ?? null;
