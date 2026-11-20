import { useState } from 'react';
import { ShoppingBasket } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className = '' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 text-emerald-800/70 p-4 text-center ${className}`}
      >
        <ShoppingBasket className="h-8 w-8 mb-2" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-600 line-clamp-2 max-w-[14ch]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      loading="lazy"
    />
  );
}
