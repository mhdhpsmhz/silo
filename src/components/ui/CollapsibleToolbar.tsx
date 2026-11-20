import type { ReactNode } from 'react';
import { ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SiloButton } from '@/components/ui/SiloButton';
interface CollapsibleToolbarProps {
  open: boolean;
  onToggle: () => void;
  activeCount?: number;
  onReset?: () => void;
  label?: string;
  rightSlot?: ReactNode;
  controlsId: string;
  children: ReactNode;
}

export function CollapsibleToolbar({
  open,
  onToggle,
  activeCount = 0,
  onReset,
  label,
  rightSlot,
  controlsId,
  children,
}: CollapsibleToolbarProps) {
  const { t } = useTranslation();
  const buttonLabel = label ?? t('toolbar.filtersAndSearch');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SiloButton
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={controlsId}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              open || activeCount > 0
                ? 'bg-silo-elevated border-silo-border-hover text-silo-text'
                : 'bg-silo-surface border-silo-border text-silo-text-secondary hover:text-silo-text hover:bg-silo-elevated'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span>{buttonLabel}</span>
            {activeCount > 0 && (
              <span className="font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded bg-silo-text text-silo-bg leading-none">
                {activeCount}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </SiloButton>

          {activeCount > 0 && onReset && (
            <SiloButton
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-silo-surface border border-silo-border text-silo-muted hover:text-silo-text hover:bg-silo-elevated transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('toolbar.resetFilters')}</span>
            </SiloButton>
          )}
        </div>

        {rightSlot && <div className="flex flex-wrap items-center gap-3">{rightSlot}</div>}
      </div>

      {open && (
        <section
          id={controlsId}
          className="p-4 bg-silo-surface border border-silo-border rounded-xl space-y-3"
        >
          {children}
        </section>
      )}
    </div>
  );
}
