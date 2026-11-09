import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Landmark } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/FormField';
import { Ornament } from '@/components/ui/Ornament';
import { formatPrice, shortOrderCode } from '@/lib/format';
import { toAppError } from '@/lib/errors';
import { orderService } from '@/services/order.service';
import { productService } from '@/services/product.service';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore, selectCartSubtotal } from '@/stores/cart.store';
import { useConfigStore } from '@/stores/config.store';
import { toast } from '@/stores/toast.store';
import { checkoutSchema, type CheckoutInput } from '@/schemas/checkout.schema';

/** Lỗi do tồn kho/giá thay đổi giữa lúc xem và lúc đặt → đồng bộ lại giỏ cho người mua thấy. */
const STOCK_ERRORS = new Set(['INSUFFICIENT_STOCK', 'PRODUCT_UNAVAILABLE']);

export function CheckoutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useAuthStore((s) => s.profile);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartSubtotal);
  const { shipping, bank } = useConfigStore((s) => s.config);
  const [placed, setPlaced] = useState<string | null>(null);

  const { register, handleSubmit, setError, reset, formState } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { phone: profile?.phone ?? '', address: '', note: '' },
  });
  const { errors, isSubmitting } = formState;

  // Mở lại modal → điền sẵn SĐT từ hồ sơ, xoá trạng thái "đã đặt" cũ.
  useEffect(() => {
    if (open) {
      setPlaced(null);
      reset((v) => ({ ...v, phone: v.phone || profile?.phone || '' }));
    }
  }, [open, profile?.phone, reset]);

  const onSubmit = handleSubmit(async (values) => {
    // Đọc state mới nhất tại thời điểm bấm (không dùng closure cũ).
    const { items: current, checkoutId, clear, reconcile } = useCartStore.getState();
    try {
      const orderId = await orderService.place({
        ...values,
        items: current.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        clientRequestId: checkoutId,
      });
      clear();
      reset({ phone: values.phone, address: '', note: '' });
      setPlaced(orderId);
      toast.success('Đơn hàng đã được ghi sổ.');
    } catch (err) {
      const e = toAppError(err);
      if (STOCK_ERRORS.has(e.code)) {
        const rows = await productService.getStock(current.map((i) => i.productId)).catch(() => []);
        reconcile(rows);
      }
      setError('root', { message: e.message });
    }
  });

  const hasBank = bank.account_number.trim() !== '';

  if (placed) {
    return (
      <Modal open={open} onClose={onClose} title="Đặt hàng thành công" size="sm">
        <div className="text-center">
          <p className="label-engraved text-brass-deep">Đã ghi sổ</p>
          <p className="mt-2 font-serif text-2xl">{shortOrderCode(placed)}</p>
          <Ornament className="mx-auto my-5 max-w-[10rem]" />
          <p className="text-ink-soft">
            Chủ tiệm sẽ gọi điện xác nhận, trao đổi tình trạng món và báo phí vận chuyển.
          </p>
        </div>
        {hasBank && (
          <div className="mt-6 border border-brass/40 bg-surface p-4 text-sm">
            <p className="mb-2 flex items-center gap-2 font-serif text-base">
              <Landmark className="h-4 w-4 text-brass-deep" strokeWidth={1.75} /> Thông tin nhận cọc
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-ink-soft">Ngân hàng</dt>
              <dd>{bank.bank_name}</dd>
              <dt className="text-ink-soft">Số TK</dt>
              <dd className="font-medium tabular-nums">{bank.account_number}</dd>
              <dt className="text-ink-soft">Chủ TK</dt>
              <dd>{bank.account_holder}</dd>
              <dt className="text-ink-soft">Nội dung</dt>
              <dd>{shortOrderCode(placed)}</dd>
            </dl>
            {bank.deposit_note && <p className="mt-2 text-ink-soft">{bank.deposit_note}</p>}
          </div>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/profile"
            onClick={onClose}
            className="border border-ink bg-ink px-5 py-2.5 text-sm text-paper transition-colors hover:bg-paper hover:text-ink"
          >
            Xem đơn của tôi
          </Link>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      title="Tiến hành lên đơn"
      subtitle={`${items.length} món · Tạm tính ${formatPrice(subtotal)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Quay lại giỏ
          </Button>
          <Button type="submit" form="checkout-form" loading={isSubmitting} disabled={items.length === 0}>
            Xác nhận đặt hàng
          </Button>
        </>
      }
    >
      <form id="checkout-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        <TextField
          label="Số điện thoại liên hệ"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <TextAreaField
          label="Địa chỉ nhận hàng"
          rows={2}
          autoComplete="street-address"
          error={errors.address?.message}
          {...register('address')}
        />
        <TextAreaField
          label="Ghi chú gửi cho Chủ tiệm"
          rows={4}
          placeholder="Vd: Gọi sau 18h · Cho xem kỹ vết trầy ở đáy bình · Muốn hẹn xem hàng trực tiếp…"
          error={errors.note?.message}
          {...register('note')}
        />
        <div className="border-t border-surface-line pt-4 text-sm text-ink-soft">
          <div className="flex justify-between">
            <span>Tạm tính</span>
            <span className="tabular-nums text-ink">{formatPrice(subtotal)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Phí ship dự kiến</span>
            <span className="tabular-nums text-ink">{formatPrice(shipping.default_fee)}</span>
          </div>
          {shipping.note && <p className="mt-2">{shipping.note}</p>}
        </div>
        {errors.root && (
          <p role="alert" className="border-l-2 border-oxblood bg-oxblood/5 px-4 py-3 text-sm text-ink">
            {errors.root.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
