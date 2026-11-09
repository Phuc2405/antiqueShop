import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface ConfirmState {
  request: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;
  ask: (opts: ConfirmOptions) => Promise<boolean>;
  settle: (ok: boolean) => void;
}

/** Hộp thoại xác nhận dạng Promise — thay cho window.confirm (đúng phong cách, không chặn luồng). */
export const useConfirmStore = create<ConfirmState>()((set, get) => ({
  request: null,
  ask: (opts) =>
    new Promise<boolean>((resolve) => {
      get().request?.resolve(false); // huỷ yêu cầu cũ nếu còn treo
      set({ request: { ...opts, resolve } });
    }),
  settle: (ok) => {
    get().request?.resolve(ok);
    set({ request: null });
  },
}));

export const confirmDialog = (opts: ConfirmOptions) => useConfirmStore.getState().ask(opts);
