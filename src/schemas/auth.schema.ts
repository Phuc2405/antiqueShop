import { z } from 'zod';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+84|0)(3|5|7|8|9)\d{8}$/, 'Số điện thoại không hợp lệ (vd: 0912345678)');

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

export const signUpSchema = signInSchema
  .extend({
    fullName: z.string().trim().min(2, 'Vui lòng nhập họ tên').max(120),
    phone: phoneSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
