import { z } from 'zod';
import { phoneSchema } from './auth.schema';

export const checkoutSchema = z.object({
  phone: phoneSchema,
  address: z.string().trim().min(5, 'Vui lòng nhập địa chỉ đầy đủ').max(500),
  note: z.string().trim().max(1000, 'Ghi chú tối đa 1000 ký tự'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
