import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

// Ảnh CC0 (Wikimedia Commons) — dùng tự do, không cần ghi nguồn. Thay bằng ảnh hàng thật của quán khi có.
const SLIDES = [
  { src: '/hero/hoa-sen.jpg', caption: 'Hoa sen', position: 'center' },
  { src: '/hero/chum-gom.jpg', caption: 'Chum gốm hoa lam thời Lê – Mạc', position: 'center 30%' },
  { src: '/hero/dong-ho.jpg', caption: 'Đồng hồ quả quýt', position: 'center' },
  { src: '/hero/chau-bat-trang.jpg', caption: 'Gốm Bát Tràng thời Nguyễn', position: 'center 45%' },
] as const;

const INTERVAL_MS = 6000;

export function HeroSlideshow() {
  const [index, setIndex] = useState(0);

  // Tự chuyển ảnh; bấm chấm tròn sẽ đặt lại bộ đếm (index đổi → effect chạy lại)
  useEffect(() => {
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index]);

  // Tải trước ảnh để chuyển không bị nháy trắng
  useEffect(() => {
    SLIDES.forEach((s) => {
      new Image().src = s.src;
    });
  }, []);

  const slide = SLIDES[index] ?? SLIDES[0];

  return (
    <section className="relative isolate flex min-h-[70vh] items-center overflow-hidden bg-night md:min-h-[78vh]">
      <AnimatePresence initial={false}>
        <motion.img
          key={slide.src}
          src={slide.src}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          style={{ objectPosition: slide.position }}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.4 }, scale: { duration: INTERVAL_MS / 1000 + 1.4, ease: 'linear' } }}
        />
      </AnimatePresence>
      {/* Lớp tối để chữ trắng luôn đọc rõ trên mọi ảnh */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/45 to-black/65" aria-hidden />

      <div className="shell pb-32 pt-16 text-center text-white sm:pb-24">
        <p className="text-lg font-semibold text-brass-light md:text-xl">Đồ cổ & đồ sưu tầm</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl leading-tight text-white sm:text-5xl md:text-6xl">
          Đồ xưa đẹp, giữ gìn qua nhiều thế hệ
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/90 md:text-xl">
          Đồng hồ, máy ảnh, gốm sứ và đồ dùng xưa — được chọn lọc và kiểm tra kỹ trước khi đến tay bạn.
        </p>
        <Link
          to="/shop"
          className="mt-10 inline-flex items-center gap-3 rounded bg-white px-8 py-4 text-lg font-semibold text-night transition-colors duration-300 hover:bg-brass-light"
        >
          Xem tất cả đồ cổ
          <ArrowRight className="h-6 w-6" strokeWidth={2} />
        </Link>
      </div>

      {/* Tên món trong ảnh + nút chọn ảnh (vùng bấm lớn cho dễ chạm) */}
      <div className="absolute inset-x-0 bottom-0 pb-4">
        <div className="shell flex flex-col items-center gap-1 sm:flex-row sm:justify-between">
          <p className="text-base text-white/85" aria-live="polite">
            {slide.caption}
          </p>
          <div className="flex">
            {SLIDES.map((s, i) => (
              <button
                key={s.src}
                onClick={() => setIndex(i)}
                className="flex h-11 w-11 items-center justify-center"
                aria-label={`Xem ảnh ${i + 1}: ${s.caption}`}
                aria-current={i === index}
              >
                <span
                  className={cn(
                    'block h-3.5 w-3.5 rounded-full border-2 border-white transition-colors',
                    i === index ? 'bg-white' : 'bg-transparent',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
