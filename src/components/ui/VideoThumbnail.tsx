import { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';

interface VideoThumbnailProps {
  src: string | null | undefined;
  fallbackSrc?: string | null;
  alt: string;
  compact?: boolean;
  className?: string;
}

export function VideoThumbnail({
  src,
  fallbackSrc,
  alt,
  compact = false,
  className,
}: VideoThumbnailProps) {
  const { t } = useTranslation();
  const [currentSrc, setCurrentSrc] = useState<string | null>(src ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(src ?? null);
    setFailed(false);
  }, [src]);

  const handleError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }
    setFailed(true);
  };

  return (
    <div
      className={cn(
        'relative w-full aspect-video bg-silo-bg border border-silo-border rounded-lg overflow-hidden flex items-center justify-center shrink-0',
        className
      )}
    >
      {currentSrc && !failed ? (
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleError}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1.5 text-silo-subtle p-2 text-center">
          <Film className={compact ? 'w-5 h-5' : 'w-7 h-7'} />
          {!compact && (
            <span className="text-xs font-mono">{t('app.thumbnailUnavailable')}</span>
          )}
        </div>
      )}
    </div>
  );
}
