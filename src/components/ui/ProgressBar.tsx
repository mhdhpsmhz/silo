import { cn } from '../../utils/cn';

interface ProgressBarProps {
  percentage: number;
  color?: string;
  heightClass?: string;
  className?: string;
}

export function ProgressBar({
  percentage,
  color = '#F4EFE3',
  heightClass = 'h-1.5',
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0));

  return (
    <div
      className={cn(
        'w-full bg-silo-bg border border-silo-border rounded-full overflow-hidden',
        heightClass,
        className
      )}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full transition-[width] duration-200 ease-out"
        style={{
          width: `${clamped}%`,
          backgroundColor: clamped >= 95 ? '#1F9967' : color,
        }}
      />
    </div>
  );
}
