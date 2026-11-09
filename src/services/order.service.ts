import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { Order, OrderStatus } from '@/types/domain';
import type { CheckoutInput } from '@/schemas/checkout.schema';

export interface PlaceOrderPayload extends CheckoutInput {
  items: { product_id: string; quantity: number }[];
  /** Sinh 1 lần cho mỗi phiên checkout → bấm 2 lần vẫn chỉ ra 1 đơn. */
  clientRequestId: string;
}

const ORDER_COLUMNS = '*, order_items(*)';
const STAFF_COLUMNS = '*, order_items(*), profiles(full_name,email)';

export const orderService = {
  /** Toàn bộ kiểm tra tồn kho + tính tiền nằm ở server (RPC place_order). */
  async place({ items, phone, address, note, clientRequestId }: PlaceOrderPayload): Promise<string> {
    return unwrap(
      await supabase.rpc('place_order', {
        p_items: items,
        p_phone: phone,
        p_address: address,
        p_note: note || null,
        p_client_request_id: clientRequestId,
      }),
    ) as string;
  },

  async listMine(userId: string): Promise<Order[]> {
    return unwrap(
      await supabase
        .from('orders')
        .select(ORDER_COLUMNS)
        .eq('buyer_id', userId) // staff đọc được mọi đơn → phải lọc rõ ràng
        .order('created_at', { ascending: false }),
    ) as Order[];
  },

  async cancel(orderId: string): Promise<OrderStatus> {
    return unwrap(await supabase.rpc('cancel_order', { p_order_id: orderId })) as OrderStatus;
  },

  // ---------- Chủ tiệm ----------
  async listByStatus(statuses: OrderStatus[]): Promise<Order[]> {
    return unwrap(
      await supabase
        .from('orders')
        .select(STAFF_COLUMNS)
        .in('status', statuses)
        .order('created_at', { ascending: false }),
    ) as Order[];
  },

  /** `expected` = trạng thái đang thấy trên màn hình → chống 2 tab ghi đè nhau. */
  async setStatus(orderId: string, next: OrderStatus, expected: OrderStatus): Promise<OrderStatus> {
    return unwrap(
      await supabase.rpc('set_order_status', { p_order_id: orderId, p_status: next, p_expected: expected }),
    ) as OrderStatus;
  },
};
