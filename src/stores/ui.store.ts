import { create } from 'zustand';

type Panel = 'cart' | 'menu' | null;

export const AUTH_REQUIRED_MESSAGE = 'Bạn cần đăng nhập tài khoản để thực hiện thao tác này.';

interface UiState {
  panel: Panel;
  open: (panel: Exclude<Panel, null>) => void;
  close: () => void;
  /** Modal yêu cầu đăng nhập (khách bấm Like / Viết review / Lên đơn). */
  authPrompt: string | null;
  promptAuth: (message?: string) => void;
  closeAuthPrompt: () => void;
}

/** Chỉ một panel (giỏ hàng / menu mobile) được mở tại một thời điểm. */
export const useUiStore = create<UiState>()((set) => ({
  panel: null,
  open: (panel) => set({ panel }),
  close: () => set({ panel: null }),
  authPrompt: null,
  promptAuth: (message = AUTH_REQUIRED_MESSAGE) => set({ authPrompt: message, panel: null }),
  closeAuthPrompt: () => set({ authPrompt: null }),
}));
