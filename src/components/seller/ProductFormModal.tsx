import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Loader2, Star, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/FormField';
import { cn } from '@/lib/cn';
import { toAppError } from '@/lib/errors';
import { productService } from '@/services/product.service';
import { toast } from '@/stores/toast.store';
import { productFormSchema, toProductInput, type ProductFormValues } from '@/schemas/product.schema';
import type { Product } from '@/types/domain';

const EMPTY: ProductFormValues = {
  title: '',
  description: '',
  era_origin: '',
  condition: '',
  provenance: '',
  price: NaN,
  stock: 1,
  is_published: true,
  image_url: [],
};

const fromProduct = (p: Product): ProductFormValues => ({
  title: p.title,
  description: p.description ?? '',
  era_origin: p.era_origin ?? '',
  condition: p.condition ?? '',
  provenance: p.provenance ?? '',
  price: p.price,
  stock: p.stock,
  is_published: p.is_published,
  image_url: p.image_url,
});

interface Props {
  open: boolean;
  onClose: () => void;
  /** null = tạo mới */
  product: Product | null;
  onSaved: (p: Product, mode: 'created' | 'updated') => void;
}

/** Form đăng bán / sửa hiện vật. Ảnh được tải lên Supabase Storage ngay khi chọn. */
export function ProductFormModal({ open, onClose, product, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const { register, handleSubmit, reset, watch, setValue, setError, formState } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: EMPTY,
  });
  const { errors, isSubmitting } = formState;
  const images = watch('image_url');

  useEffect(() => {
    if (open) reset(product ? fromProduct(product) : EMPTY);
  }, [open, product, reset]);

  const setImages = (next: string[]) => setValue('image_url', next, { shouldValidate: true, shouldDirty: true });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = 10 - images.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) toast.info(`Chỉ thêm được ${room} ảnh nữa (tối đa 10).`);
    setUploading((n) => n + list.length);
    // Tải song song; ảnh lỗi không làm hỏng các ảnh khác
    const results = await Promise.allSettled(list.map((f) => productService.uploadImage(f)));
    setUploading((n) => n - list.length);
    const urls = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    results.forEach((r) => r.status === 'rejected' && toast.error(toAppError(r.reason).message));
    if (urls.length) setImages([...watch('image_url'), ...urls]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const makeCover = (i: number) => {
    const next = [...images];
    const [img] = next.splice(i, 1);
    if (img) setImages([img, ...next]);
  };

  const submit = handleSubmit(async (values) => {
    try {
      const input = toProductInput(values);
      const saved = product
        ? await productService.update(product.id, product.version, input)
        : await productService.create(input);
      onSaved(saved, product ? 'updated' : 'created');
      onClose();
    } catch (err) {
      setError('root', { message: toAppError(err).message });
    }
  });

  const busy = isSubmitting || uploading > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      size="lg"
      title={product ? 'Sửa hiện vật' : 'Đăng bán hiện vật mới'}
      subtitle={product ? product.title : 'Điền thông tin như viết phiếu lưu kho'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Huỷ
          </Button>
          <Button type="submit" form="product-form" loading={isSubmitting} disabled={busy}>
            {product ? 'Lưu thay đổi' : 'Đăng bán'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="space-y-6" noValidate>
        {/* Ảnh */}
        <div>
          <p className="label-engraved mb-2">Ảnh hiện vật (ảnh đầu tiên là ảnh bìa)</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {images.map((src, i) => (
              <div key={src} className={cn('group relative aspect-[4/5] border p-0.5', i === 0 ? 'border-brass' : 'border-surface-line')}>
                <img src={src} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 bg-brass px-1 text-xs text-night">Bìa</span>}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-night/60 p-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  {i > 0 ? (
                    <button type="button" onClick={() => makeCover(i)} className="p-1 text-white" aria-label="Đặt làm ảnh bìa" title="Đặt làm ảnh bìa">
                      <Star className="h-4 w-4" />
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="p-1 text-white"
                    aria-label="Bỏ ảnh"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {images.length < 10 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading > 0}
                className="flex aspect-[4/5] flex-col items-center justify-center gap-1 border border-dashed border-brass/60 text-sm text-ink-soft transition-colors hover:bg-surface"
              >
                {uploading > 0 ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Đang tải {uploading}…
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-6 w-6" strokeWidth={1.5} /> Thêm ảnh
                  </>
                )}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            hidden
            onChange={(e) => void onFiles(e.target.files)}
          />
          {errors.image_url && <p className="mt-1 text-sm text-oxblood">{errors.image_url.message}</p>}
        </div>

        <TextField label="Tên hiện vật" error={errors.title?.message} {...register('title')} />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Niên đại · Xuất xứ" placeholder="Thập niên 1930 · Pháp" error={errors.era_origin?.message} {...register('era_origin')} />
          <TextField label="Tình trạng" placeholder="Còn 90%, vết xước nhẹ ở đáy" error={errors.condition?.message} {...register('condition')} />
          <TextField
            label="Giá bán (VNĐ)"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            error={errors.price?.message}
            {...register('price', { valueAsNumber: true })}
          />
          <TextField
            label="Số lượng trong kho"
            type="number"
            inputMode="numeric"
            min={0}
            error={errors.stock?.message}
            {...register('stock', { valueAsNumber: true })}
          />
        </div>

        <TextAreaField label="Mô tả" rows={4} error={errors.description?.message} {...register('description')} />
        <TextAreaField
          label="Lịch sử món đồ"
          rows={3}
          placeholder="Món đồ từng thuộc về ai, đi qua những đâu…"
          error={errors.provenance?.message}
          {...register('provenance')}
        />

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--c-brass))]" {...register('is_published')} />
          Trưng bày trên cửa hàng (bỏ chọn để cất vào kho, khách không thấy)
        </label>

        {errors.root && <p role="alert" className="border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm">{errors.root.message}</p>}
      </form>
    </Modal>
  );
}
