import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { Profile, UserRole } from '@/types/domain';

const COLUMNS = 'id,email,full_name,phone,role,is_blocked,created_at';

/** Chỉ admin dùng. Quyền thật được trigger guard_profile_update + RLS kiểm tra. */
export const userService = {
  async list(): Promise<Profile[]> {
    return unwrap(
      await supabase.from('profiles').select(COLUMNS).order('created_at', { ascending: false }),
    ) as Profile[];
  },

  async setRole(userId: string, role: UserRole): Promise<Profile> {
    return unwrap(
      await supabase.from('profiles').update({ role }).eq('id', userId).select(COLUMNS).single(),
    ) as Profile;
  },

  async setBlocked(userId: string, blocked: boolean): Promise<Profile> {
    return unwrap(
      await supabase.from('profiles').update({ is_blocked: blocked }).eq('id', userId).select(COLUMNS).single(),
    ) as Profile;
  },
};
