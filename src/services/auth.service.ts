import { supabase } from '@/lib/supabase';
import { toAppError, unwrap } from '@/lib/errors';
import type { Profile } from '@/types/domain';
import type { SignInInput, SignUpInput } from '@/schemas/auth.schema';

const PROFILE_COLUMNS = 'id,email,full_name,phone,role,is_blocked,created_at';

export const authService = {
  async signIn({ email, password }: SignInInput) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw toAppError(error);
    return data;
  },

  async signUp({ email, password, fullName, phone }: SignUpInput) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } }, // trigger handle_new_user đọc metadata này
    });
    if (error) throw toAppError(error);
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw toAppError(error);
  },

  async getProfile(userId: string): Promise<Profile | null> {
    return unwrap(
      await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle(),
    ) as Profile | null;
  },

  async updateProfile(userId: string, patch: Pick<Profile, 'full_name' | 'phone'>): Promise<Profile> {
    return unwrap(
      await supabase.from('profiles').update(patch).eq('id', userId).select(PROFILE_COLUMNS).single(),
    ) as Profile;
  },
};
