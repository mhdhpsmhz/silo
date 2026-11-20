import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';

import { SiloButton } from '@/components/ui/SiloButton';
interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClass?: string;
}

export function ModalShell({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidthClass = 'max-w-2xl',
}: ModalShellProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-silo-backdrop/85"
        className={`flex w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-xl border border-silo-border bg-silo-surface p-0 text-silo-text ring-0 ${maxWidthClass} max-h-[90vh]`}
      >
        <DialogHeader className="flex shrink-0 flex-row items-start justify-between gap-4 border-b border-silo-border bg-silo-surface px-6 py-4">
          <div className="min-w-0">
            <DialogTitle className="text-lg font-semibold tracking-tight text-silo-text">
              {title}
            </DialogTitle>
          </div>
          <SiloButton
            type="button"
            onClick={onClose}
            aria-label={`${t('app.close')} ${title}`}
            className="shrink-0 rounded-lg p-2 text-silo-muted transition-colors hover:bg-silo-elevated hover:text-silo-text"
          >
            <X className="h-4 w-4" />
          </SiloButton>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-silo-border bg-silo-surface px-6 py-4">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
