import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Logo } from './Logo';
import { Ornament } from '@/components/ui/Ornament';
import { site } from '@/config/site';
import { useStoreInfo } from '@/stores/config.store';

export function Footer() {
  const store = useStoreInfo();
  return (
    <footer className="mt-24 border-t border-brass/40 bg-paper-deep">
      <div className="shell py-12 md:py-16">
        <div className="grid gap-10 text-center md:grid-cols-3 md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <Logo compact />
            <p className="mt-4 max-w-xs font-serif text-sm leading-relaxed text-ink-soft">
              Tuyển chọn đồ cổ và đồ sưu tầm có nguồn gốc rõ ràng — được kiểm định, lau chùi và kể lại câu chuyện của chúng.
            </p>
          </div>

          <div>
            <h3 className="label-engraved mb-4">Khám phá</h3>
            <ul className="space-y-2 text-sm">
              {site.nav.map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className="link-quill text-ink-soft hover:text-ink">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="label-engraved mb-4">Liên hệ</h3>
            <ul className="space-y-2 text-sm text-ink-soft">
              <li className="flex items-center justify-center gap-2 md:justify-start">
                <MapPin className="h-4 w-4 text-brass" strokeWidth={1.75} /> {store.address}
              </li>
              <li className="flex items-center justify-center gap-2 md:justify-start">
                <Phone className="h-4 w-4 text-brass" strokeWidth={1.75} />
                <a href={`tel:${store.hotline.replace(/\s/g, '')}`} className="link-quill hover:text-ink">{store.hotline}</a>
              </li>
              <li className="flex items-center justify-center gap-2 md:justify-start">
                <Mail className="h-4 w-4 text-brass" strokeWidth={1.75} />
                <a href={`mailto:${store.email}`} className="link-quill hover:text-ink">{store.email}</a>
              </li>
            </ul>
          </div>
        </div>

        <Ornament className="mx-auto mt-12 max-w-md" />
        <p className="pb-safe mt-6 text-center font-engraved text-sm text-ink-faint">
          © {new Date().getFullYear()} {store.name} · {site.established}
        </p>
      </div>
    </footer>
  );
}
