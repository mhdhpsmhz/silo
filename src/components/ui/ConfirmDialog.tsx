import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '../../store/uiStore';
import { ModalShell } from './ModalShell';
import { Button } from './button';

export function ConfirmDialog() {
  const { t } = useTranslation();
  const { confirmDialog, closeConfirmDialog } = useUiStore();
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    if (!confirmDialog.onConfirm || pending) return;
    setPending(true);
    try {
      await confirmDialog.onConfirm();
      closeConfirmDialog();
    } finally {
      setPending(false);
    }
  };

  return (
    <ModalShell
      open={confirmDialog.open}
      onClose={closeConfirmDialog}
      title={confirmDialog.title}
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={closeConfirmDialog}
            disabled={pending}
            className="h-9 rounded-lg border-silo-border bg-silo-elevated px-4 text-sm font-medium text-silo-text transition-colors hover:bg-silo-border hover:text-silo-text"
          >
            {t('app.cancel')}
          </Button>
          <Button
            type="button"
            variant={confirmDialog.destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={pending}
            className={`h-9 rounded-lg px-4 text-sm font-medium transition-colors ${
              confirmDialog.destructive
                ? 'bg-silo-danger text-silo-text hover:bg-silo-danger-hover'
                : 'bg-silo-text text-silo-bg hover:bg-silo-text-hover'
            }`}
          >
            {pending ? t('app.processing') : confirmDialog.confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg shrink-0 ${
            confirmDialog.destructive
              ? 'bg-silo-danger-surface text-silo-danger-text'
              : 'bg-silo-elevated text-silo-text'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-silo-text-secondary leading-relaxed">
          {confirmDialog.description}
        </p>
      </div>
    </ModalShell>
  );
}
