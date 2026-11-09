import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Ornament } from '@/components/ui/Ornament';
import { useStoreInfo } from '@/stores/config.store';

/** Thông tin liên hệ — lấy từ Cấu hình hệ thống (admin chỉnh được). */
export default function ContactPage() {
  const s = useStoreInfo();
  const rows = [
    { icon: MapPin, label: 'Địa chỉ', value: s.address },
    { icon: Phone, label: 'Hotline', value: s.hotline, href: `tel:${s.hotline.replace(/\s/g, '')}` },
    { icon: MessageCircle, label: 'Zalo', value: s.zalo, href: `https://zalo.me/${s.zalo.replace(/\D/g, '')}` },
    { icon: Mail, label: 'Email', value: s.email, href: `mailto:${s.email}` },
  ].filter((r) => r.value);

  return (
    <div className="shell max-w-2xl py-14 md:py-20">
      <h1 className="text-center text-3xl md:text-5xl">Liên hệ</h1>
      <Ornament className="mx-auto my-8 max-w-xs" />
      <p className="text-center font-serif text-ink-soft">
        Ghé {s.name} xem hàng tận tay, hoặc gọi trước để chủ tiệm chuẩn bị món bạn quan tâm.
      </p>
      <dl className="card-paper mt-10 divide-y divide-surface-line">
        {rows.map(({ icon: Icon, label, value, href }) => (
          <div key={label} className="flex items-center gap-4 px-6 py-4">
            <Icon className="h-5 w-5 shrink-0 text-brass" strokeWidth={1.75} aria-hidden />
            <dt className="w-20 text-ink-soft">{label}</dt>
            <dd className="min-w-0 flex-1 truncate">
              {href ? (
                <a href={href} className="link-quill" target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                  {value}
                </a>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
