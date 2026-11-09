import { z } from 'zod';

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Vui lòng chọn số sao').max(5),
  comment: z.string().trim().min(5, 'Nhận xét tối thiểu 5 ký tự').max(2000, 'Tối đa 2000 ký tự'),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const replySchema = z.object({
  reply: z.string().trim().min(2, 'Phản hồi tối thiểu 2 ký tự').max(2000, 'Tối đa 2000 ký tự'),
});
export type ReplyInput = z.infer<typeof replySchema>;
