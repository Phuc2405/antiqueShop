/** Màu từ biến CSS dạng kênh RGB, vẫn hỗ trợ độ mờ kiểu `bg-paper/95` */
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Màu theo chủ đề (sáng/tối) — giá trị nằm ở biến CSS trong src/index.css
        // Nền giấy bồi
        paper: { DEFAULT: c('paper'), deep: c('paper-deep') },
        // Bề mặt thẻ
        surface: { DEFAULT: c('surface'), line: c('surface-line') },
        // Mực tàu / gỗ mun
        ink: { DEFAULT: c('ink'), soft: c('ink-soft'), faint: c('ink-faint') },
        // Đồng cổ — DEFAULT dùng cho viền/hoa văn; `deep` dùng cho CHỮ (đủ tương phản WCAG AA trên nền)
        // `light` cố định: dùng trên ảnh/nền tối ở cả hai chế độ
        brass: { DEFAULT: c('brass'), light: '#E6D5AE', deep: c('brass-deep') },
        // Đỏ đất sẫm — nhấn mạnh, lỗi, trạng thái "hết hàng"
        oxblood: { DEFAULT: c('oxblood'), light: c('oxblood-light') },
        moss: c('moss'),
        // Màu tối CỐ ĐỊNH (không đổi theo chủ đề) — lớp phủ, nền dưới ảnh
        night: '#2C221E',
      },
      fontFamily: {
        engraved: ['"Be Vietnam Pro"', '"Segoe UI"', 'Arial', 'sans-serif'],
        serif: ['"Noto Serif"', '"Times New Roman"', 'serif'],
        sans: ['"Be Vietnam Pro"', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '2px',
      },
      letterSpacing: {
        engraved: '0',
      },
      boxShadow: {
        // Khung tranh mạ đồng: viền trong + viền ngoài mảnh
        frame: 'inset 0 0 0 1px rgba(197,160,89,.55), 0 0 0 4px rgb(var(--c-surface)), 0 0 0 5px rgba(197,160,89,.45)',
        lift: 'var(--shadow-lift)',
      },
      maxWidth: { shell: '76rem' },
      transitionTimingFunction: { quill: 'cubic-bezier(.22,.61,.36,1)' },
    },
  },
  plugins: [],
};
