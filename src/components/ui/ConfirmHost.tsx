import { Modal } from './Modal';
import { Button } from './Button';
import { useConfirmStore } from '@/stores/confirm.store';

/** Render hộp thoại cho `confirmDialog(...)`. Gắn một lần ở AppShell. */
export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request);
  const settle = useConfirmStore((s) => s.settle);

  return (
    <Modal
      open={!!request}
      onClose={() => settle(false)}
      title={request?.title ?? ''}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => settle(false)}>
            Quay lại
          </Button>
          <Button variant={request?.danger ? 'danger' : 'primary'} onClick={() => settle(true)} autoFocus>
            {request?.confirmLabel ?? 'Xác nhận'}
          </Button>
        </>
      }
    >
      {request?.message && <p className="text-ink-soft">{request.message}</p>}
    </Modal>
  );
}
