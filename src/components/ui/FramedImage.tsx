import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
  ratio?: 'portrait' | 'square';
  muted?: boolean; // làm mờ khi hết hàng
}

/** Ảnh trong khung tranh mạ đồng, giữ tỉ lệ cố định để lưới không bị "nhảy" khi ảnh load. */
export function FramedImage({ src, alt, className, ratio = 'portrait', muted }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn('frame-brass', className)}>
      <div
        className={cn(
          'relative overflow-hidden bg-paper-deep',
          ratio === 'portrait' ? 'aspect-[4/5]' : 'aspect-square',
        )}
      >
        {src && !failed ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className={cn(
              'h-full w-full object-cover transition-[transform,filter] duration-700 ease-quill',
              'sepia-[.15] group-hover:scale-[1.03] group-hover:sepia-0',
              muted && 'grayscale',
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-faint">
            <ImageOff className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </div>
        )}
      </div>
    </div>
  );
}
