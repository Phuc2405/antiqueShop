import { z } from 'zod';

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === '' || /^[0-9 +().-]{8,20}$/.test(v), 'Số điện thoại không hợp lệ');

export const settingsSchema = z.object({
  store_info: z.object({
    name: z.string().trim().min(2, 'Nhập tên tiệm').max(80),
    tagline: z.string().trim().max(120),
    hotline: optionalPhone,
    zalo: optionalPhone,
    email: z.string().trim().refine((v) => v === '' || z.string().email().safeParse(v).success, 'Email không hợp lệ'),
    address: z.string().trim().max(300),
  }),
  shipping: z.object({
    default_fee: z.number({ error: 'Nhập phí ship' }).int().min(0, 'Phí không được âm').max(10_000_000),
    note: z.string().trim().max(300),
  }),
  bank: z.object({
    bank_name: z.string().trim().max(120),
    account_number: z
      .string()
      .trim()
      .refine((v) => v === '' || /^[0-9 ]{6,24}$/.test(v), 'Số tài khoản chỉ gồm chữ số'),
    account_holder: z.string().trim().max(120),
    deposit_note: z.string().trim().max(300),
  }),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
