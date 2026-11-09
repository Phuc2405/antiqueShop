import { Link } from 'react-router-dom';
import { Ornament } from '@/components/ui/Ornament';

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="shell py-24 text-center">
      <h1 className="text-3xl md:text-4xl">{title}</h1>
      <Ornament className="mx-auto my-6 max-w-[10rem]" />
      <p className="font-serif text-ink-soft">Trang này đang được người thợ hoàn thiện.</p>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="shell py-24 text-center">
      <p className="font-engraved text-6xl text-brass">404</p>
      <Ornament className="mx-auto my-6 max-w-[10rem]" />
      <p className="font-serif text-lg text-ink-soft">Trang này đã thất lạc trong kho lưu trữ.</p>
      <Link to="/" className="link-quill mt-6 inline-block font-engraved text-sm">
        Về trang chủ
      </Link>
    </div>
  );
}
