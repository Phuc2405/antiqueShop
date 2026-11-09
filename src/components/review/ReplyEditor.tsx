import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/FormField';
import { toAppError } from '@/lib/errors';
import { reviewService } from '@/services/review.service';
import { toast } from '@/stores/toast.store';
import { replySchema, type ReplyInput } from '@/schemas/review.schema';
import type { Review } from '@/types/domain';

/** Ô soạn "Trả lời từ Chủ tiệm" ngay dưới review. */
export function ReplyEditor({ review, onSaved, onCancel }: { review: Review; onSaved: (r: Review) => void; onCancel: () => void }) {
  const { register, handleSubmit, formState } = useForm<ReplyInput>({
    resolver: zodResolver(replySchema),
    defaultValues: { reply: review.seller_reply ?? '' },
  });
  const { errors, isSubmitting } = formState;

  const submit = handleSubmit(async ({ reply }) => {
    try {
      const saved = await reviewService.reply(review.id, reply);
      toast.success('Đã đăng phản hồi.');
      onSaved({ ...review, ...saved });
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  });

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 border-l-2 border-brass/60 pl-4" noValidate>
      <TextAreaField
        label="Trả lời từ Chủ tiệm"
        rows={3}
        autoFocus
        placeholder="Cảm ơn quý khách đã ghé tiệm…"
        error={errors.reply?.message}
        {...register('reply')}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={isSubmitting}>
          Đăng phản hồi
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Huỷ
        </Button>
      </div>
    </form>
  );
}
