import { useState, useEffect } from 'react';
import { getInitials } from '../../utils/youtube';
import { cn } from '../../utils/cn';

interface ChannelAvatarProps {
  name: string;
  avatarUrl?: string | null;
  accentColor?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
} as const;

export function ChannelAvatar({
  name,
  avatarUrl,
  accentColor,
  size = 'md',
  className,
}: ChannelAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  const initials = getInitials(name);

  return (
    <div
      className={cn(
        'rounded-full border border-silo-border bg-silo-elevated flex items-center justify-center overflow-hidden shrink-0 font-mono font-semibold text-silo-text',
        SIZE_CLASSES[size],
        className
      )}
      style={
        !avatarUrl || imgFailed
          ? { backgroundColor: accentColor || '#2C2C2C' }
          : undefined
      }
      aria-label={`${name} avatar`}
    >
      {avatarUrl && !imgFailed ? (
        <img
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
