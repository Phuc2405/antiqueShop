const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatPrice = (value: number) => vnd.format(value);
export const formatDate = (iso: string) => date.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
/** "2026-11" → "Tháng 11/2026" */
export const formatMonthKey = (key: string) => {
  const [y, m] = key.split('-');
  return `Tháng ${Number(m)}/${y}`;
};
/** Mã đơn ngắn gọn để hiển thị / đọc qua điện thoại. */
export const shortOrderCode = (id: string) => `HC-${id.slice(0, 8).toUpperCase()}`;
