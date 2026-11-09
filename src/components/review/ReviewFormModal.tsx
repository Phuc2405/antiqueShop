import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/FormField';
import { StarInput } from '@/components/ui/StarRating';
import { toAppError } from '@/lib/errors';
import { reviewSchema, type ReviewInput } from '@/schemas/review.schema';

interface Props {
  open: boolean;
  onClose: () => void;
  productTitle: string;
  initial?: ReviewInput;
  onSubmit: (values: ReviewInput) => Promise<void>;
}

/** Viết mới / chỉnh sửa đánh giá. */
export function ReviewFormModal({ open, onClose, productTitle, initial, onSubmit }: Props) {
  const { control, register, handleSubmit, reset, setError, formState } = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: initial ?? { rating: 0, comment: '' },
  });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    if (open) reset(initial ?? { rating: 0, comment: '' });
  }, [open, initial, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      setError('root', { message: toAppError(err).message });
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      title={initial ? 'Chỉnh sửa đánh giá' : 'Viết đánh giá'}
      subtitle={productTitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Huỷ
          </Button>
          <Button type="submit" form="review-form" loading={isSubmitting}>
            {initial ? 'Lưu thay đổi' : 'Gửi đánh giá'}
          </Button>
        </>
      }
    >
      <form id="review-form" onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <p className="label-engraved mb-1">Mức độ hài lòng</p>
          <Controller
            control={control}
            name="rating"
            render={({ field }) => <StarInput value={field.value} onChange={field.onChange} error={errors.rating?.message} />}
          />
        </div>
        <TextAreaField
          label="Nhận xét"
          rows={5}
          placeholder="Món đồ đúng mô tả chứ? Đóng gói, giao nhận thế nào?…"
          error={errors.comment?.message}
          {...register('comment')}
        />
        {errors.root && <p className="border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm">{errors.root.message}</p>}
      </form>
    </Modal>
  );
}
