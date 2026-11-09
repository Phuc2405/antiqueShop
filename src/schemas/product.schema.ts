import { z } from 'zod';

/** Schema cho FORM tạo/sửa sản phẩm (mọi ô chữ là string; chuỗi rỗng → null khi gửi lên DB). */
export const productFormSchema = z.object({
  title: z.string().trim().min(2, 'Tên hiện vật tối thiểu 2 ký tự').max(200, 'Tối đa 200 ký tự'),
  description: z.string().trim().max(5000, 'Tối đa 5000 ký tự'),
  era_origin: z.string().trim().max(120, 'Tối đa 120 ký tự'),
  condition: z.string().trim().max(500, 'Tối đa 500 ký tự'),
  provenance: z.string().trim().max(5000, 'Tối đa 5000 ký tự'),
  price: z
    .number({ error: 'Vui lòng nhập giá bán' })
    .int('Giá phải là số nguyên (VNĐ)')
    .min(0, 'Giá không được âm')
    .max(100_000_000_000, 'Giá quá lớn'),
  stock: z
    .number({ error: 'Vui lòng nhập số lượng' })
    .int('Số lượng phải là số nguyên')
    .min(0, 'Số lượng không được âm')
    .max(9999),
  is_published: z.boolean(),
  image_url: z.array(z.string().url()).min(1, 'Cần ít nhất 1 ảnh cho hiện vật').max(10, 'Tối đa 10 ảnh'),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

/** Payload ghi vào bảng products. */
export interface ProductInput {
  title: string;
  description: string | null;
  era_origin: string | null;
  condition: string | null;
  provenance: string | null;
  price: number;
  stock: number;
  is_published: boolean;
  image_url: string[];
}

const nullIfEmpty = (s: string) => (s.trim() === '' ? null : s.trim());

export const toProductInput = (v: ProductFormValues): ProductInput => ({
  ...v,
  description: nullIfEmpty(v.description),
  era_origin: nullIfEmpty(v.era_origin),
  condition: nullIfEmpty(v.condition),
  provenance: nullIfEmpty(v.provenance),
});
