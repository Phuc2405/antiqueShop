import type { PostgrestError } from '@supabase/supabase-js';

/** Lỗi nghiệp vụ đã được dịch sang tiếng Việt, an toàn để hiện cho người dùng. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

type Detail = { details?: string | null; hint?: string | null };

const MESSAGES: Record<string, (e: Detail) => string> = {
  NOT_CONFIGURED: () => 'Chưa kết nối Supabase — kiểm tra file .env.',
  AUTH_REQUIRED: () => 'Vui lòng đăng nhập để tiếp tục.',
  ACCOUNT_BLOCKED: () => 'Tài khoản của bạn đang bị khoá. Vui lòng liên hệ cửa hàng.',
  EMPTY_CART: () => 'Giỏ hàng đang trống.',
  CART_TOO_LARGE: () => 'Giỏ hàng có quá nhiều món.',
  TOO_MANY_PENDING_ORDERS: () => 'Bạn đang có nhiều đơn chờ xác nhận. Vui lòng chờ chủ tiệm liên hệ.',
  PRODUCT_UNAVAILABLE: (e) => `“${e.details ?? 'Một món'}” không còn được bày bán.`,
  INSUFFICIENT_STOCK: (e) =>
    `“${e.details ?? 'Một món'}” chỉ còn ${e.hint ?? 0} chiếc — có người vừa mua trước bạn.`,
  INVALID_QUANTITY: () => 'Số lượng không hợp lệ.',
  ORDER_NOT_FOUND: () => 'Không tìm thấy đơn hàng.',
  REVIEW_NOT_FOUND: () => 'Đánh giá không còn tồn tại.',
  REPLY_TOO_LONG: () => 'Phản hồi tối đa 2000 ký tự.',
  INVALID_TRANSITION: () => 'Đơn hàng không thể chuyển sang trạng thái này.',
  STALE_ORDER: () => 'Đơn vừa được cập nhật ở nơi khác. Đã tải lại dữ liệu mới nhất.',
  STALE_PRODUCT: () => 'Sản phẩm vừa được sửa ở nơi khác. Vui lòng tải lại trước khi lưu.',
  FORBIDDEN: () => 'Bạn không có quyền thực hiện thao tác này.',
  FORBIDDEN_ROLE_CHANGE: () => 'Chỉ quản trị viên mới được đổi quyền hoặc khoá tài khoản.',
  FORBIDDEN_EMAIL_CHANGE: () => 'Không thể đổi email tại đây.',
  CANNOT_CHANGE_SELF: () => 'Bạn không thể tự đổi quyền hoặc tự khoá tài khoản của chính mình.',
};

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const pg = err as Partial<PostgrestError> | undefined;
  const code = pg?.message ?? 'UNKNOWN';
  const builder = MESSAGES[code];
  if (builder) return new AppError(code, builder({ details: pg?.details, hint: pg?.hint }), err);
  if (pg?.code === '23505') return new AppError('DUPLICATE', 'Dữ liệu này đã tồn tại.', err);
  if (pg?.code === '23503') return new AppError('IN_USE', 'Dữ liệu đang được tham chiếu ở nơi khác.', err);
  if (pg?.code === '42501') return new AppError('FORBIDDEN', MESSAGES.FORBIDDEN!({}), err);
  if (err instanceof Error && /fetch|network/i.test(err.message)) {
    return new AppError('NETWORK', 'Mất kết nối mạng. Vui lòng thử lại.', err);
  }
  return new AppError('UNKNOWN', 'Đã có lỗi xảy ra. Vui lòng thử lại.', err);
}

/** Unwrap kết quả Supabase: ném AppError nếu có lỗi. */
export function unwrap<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw toAppError(res.error);
  return res.data as T;
}
