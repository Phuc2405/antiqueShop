import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Landmark, Store, Truck } from 'lucide-react';
import { DashHeader } from '@/layouts/DashboardShell';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/FormField';
import { toAppError } from '@/lib/errors';
import { configService } from '@/services/config.service';
import { useConfigStore } from '@/stores/config.store';
import { toast } from '@/stores/toast.store';
import { settingsSchema, type SettingsInput } from '@/schemas/settings.schema';

export default function AdminSettingsPage() {
  const config = useConfigStore((s) => s.config);
  const loaded = useConfigStore((s) => s.loaded);
  const setConfig = useConfigStore((s) => s.set);
  const { register, handleSubmit, reset, formState } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: config,
  });
  const { errors, isSubmitting, isDirty } = formState;

  // Cấu hình tải xong sau khi form đã mount → điền lại
  useEffect(() => {
    if (loaded) reset(config);
  }, [loaded, config, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await configService.save(values);
      setConfig(values);
      reset(values);
      toast.success('Đã lưu cấu hình. Thông tin mới hiển thị ngay trên cửa hàng.');
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <DashHeader
        title="Cấu hình hệ thống"
        description="Thông tin tiệm, phí vận chuyển và tài khoản nhận cọc."
        actions={
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Lưu cấu hình
          </Button>
        }
      />

      <div className="max-w-3xl space-y-8">
        <Fieldset icon={Store} title="Thông tin tiệm">
          <TextField label="Tên tiệm" error={errors.store_info?.name?.message} {...register('store_info.name')} />
          <TextField label="Khẩu hiệu" error={errors.store_info?.tagline?.message} {...register('store_info.tagline')} />
          <TextField label="Hotline" type="tel" error={errors.store_info?.hotline?.message} {...register('store_info.hotline')} />
          <TextField label="Zalo" type="tel" error={errors.store_info?.zalo?.message} {...register('store_info.zalo')} />
          <TextField label="Email" type="email" error={errors.store_info?.email?.message} {...register('store_info.email')} />
          <TextField label="Địa chỉ" error={errors.store_info?.address?.message} {...register('store_info.address')} />
        </Fieldset>

        <Fieldset icon={Truck} title="Vận chuyển">
          <TextField
            label="Phí ship mặc định (VNĐ)"
            type="number"
            min={0}
            step={1000}
            error={errors.shipping?.default_fee?.message}
            {...register('shipping.default_fee', { valueAsNumber: true })}
          />
          <TextAreaField
            label="Ghi chú vận chuyển"
            rows={2}
            className="sm:col-span-2"
            error={errors.shipping?.note?.message}
            {...register('shipping.note')}
          />
        </Fieldset>

        <Fieldset icon={Landmark} title="Tài khoản ngân hàng nhận cọc">
          <TextField label="Ngân hàng" placeholder="Vietcombank – CN Sài Gòn" error={errors.bank?.bank_name?.message} {...register('bank.bank_name')} />
          <TextField label="Số tài khoản" inputMode="numeric" error={errors.bank?.account_number?.message} {...register('bank.account_number')} />
          <TextField label="Chủ tài khoản" error={errors.bank?.account_holder?.message} {...register('bank.account_holder')} />
          <TextAreaField
            label="Quy định đặt cọc"
            rows={2}
            className="sm:col-span-2"
            error={errors.bank?.deposit_note?.message}
            {...register('bank.deposit_note')}
          />
          <p className="text-sm text-ink-soft sm:col-span-2">
            Thông tin này hiện cho khách ngay sau khi đặt hàng thành công (để trống số tài khoản sẽ ẩn mục này).
          </p>
        </Fieldset>
      </div>
    </form>
  );
}

function Fieldset({ icon: Icon, title, children }: { icon: typeof Store; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="card-paper p-5 sm:p-6">
      <legend className="flex items-center gap-2 bg-paper px-2 font-serif text-lg">
        <Icon className="h-5 w-5 text-brass-deep" strokeWidth={1.75} aria-hidden /> {title}
      </legend>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
