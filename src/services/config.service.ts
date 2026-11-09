import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { SystemConfig } from '@/types/domain';

type ConfigKey = keyof SystemConfig;

export const configService = {
  async getAll(): Promise<Partial<SystemConfig>> {
    const rows = unwrap(await supabase.from('system_configs').select('key,value')) as {
      key: string;
      value: unknown;
    }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<SystemConfig>;
  },

  async save(config: SystemConfig): Promise<void> {
    const rows = (Object.keys(config) as ConfigKey[]).map((key) => ({ key, value: config[key] }));
    unwrap(await supabase.from('system_configs').upsert(rows, { onConflict: 'key' }));
  },
};
