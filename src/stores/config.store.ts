import { create } from 'zustand';
import { isSupabaseConfigured } from '@/lib/supabase';
import { configService } from '@/services/config.service';
import { site } from '@/config/site';
import type { SystemConfig } from '@/types/domain';

/** Giá trị mặc định khi DB chưa có / chưa kết nối. */
export const DEFAULT_CONFIG: SystemConfig = {
  store_info: {
    name: site.name,
    tagline: site.tagline,
    hotline: site.phone,
    zalo: site.phone,
    email: site.email,
    address: site.city,
  },
  shipping: { default_fee: 30000, note: 'Phí ship thực tế được chủ tiệm báo khi gọi xác nhận.' },
  bank: { bank_name: '', account_number: '', account_holder: '', deposit_note: '' },
};

const merge = (partial: Partial<SystemConfig>): SystemConfig => ({
  store_info: { ...DEFAULT_CONFIG.store_info, ...partial.store_info },
  shipping: { ...DEFAULT_CONFIG.shipping, ...partial.shipping },
  bank: { ...DEFAULT_CONFIG.bank, ...partial.bank },
});

interface ConfigState {
  config: SystemConfig;
  loaded: boolean;
  load: () => Promise<void>;
  set: (config: SystemConfig) => void;
}

export const useConfigStore = create<ConfigState>()((set) => ({
  config: DEFAULT_CONFIG,
  loaded: false,
  load: async () => {
    if (!isSupabaseConfigured) return set({ loaded: true });
    try {
      set({ config: merge(await configService.getAll()), loaded: true });
    } catch (err) {
      console.error('[config] load failed', err);
      set({ loaded: true });
    }
  },
  set: (config) => set({ config: merge(config) }),
}));

export const useStoreInfo = () => useConfigStore((s) => s.config.store_info);
