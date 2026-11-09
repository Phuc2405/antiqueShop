import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Ảnh lớn trong khung đồng + dải ảnh nhỏ. Rê chuột lên ảnh lớn để soi chi tiết (zoom theo con trỏ). */
export function ProductGallery({ images, title, muted }: { images: string[]; title: string; muted?: boolean }) {
  const [index, setIndex] = useState(0);
  const [origin, setOrigin] = useState('50% 50%');
  const [zoom, setZoom] = useState(false);
  const current = images[index];

  return (
    <div>
      <div className="frame-brass">
        <div
          className="relative aspect-[4/5] cursor-zoom-in overflow-hidden bg-paper-deep"
          onMouseEnter={() => setZoom(true)}
          onMouseLeave={() => setZoom(false)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {current ? (
              <motion.img
                key={current}
                src={current}
                alt={`${title} — ảnh ${index + 1}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ transformOrigin: origin }}
                className={cn(
                  'h-full w-full object-cover transition-transform duration-300 ease-quill',
                  zoom && 'scale-[1.8]',
                  muted && 'grayscale',
                )}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-ink-faint">
                <ImageOff className="h-8 w-8" strokeWidth={1.5} aria-hidden />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {images.length > 1 && (
        <div className="scrollbar-thin mt-5 flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Chọn ảnh">
          {images.map((src, i) => (
            <button
              key={src}
              role="tab"
              aria-selected={i === index}
              aria-label={`Ảnh ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                'h-20 w-16 shrink-0 border p-0.5 transition-colors',
                i === index ? 'border-brass' : 'border-surface-line opacity-70 hover:opacity-100',
              )}
            >
              <img src={src} alt="" className="h-full w-full object-cover sepia-[.15]" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
