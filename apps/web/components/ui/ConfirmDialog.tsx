'use client';

// Modal confirmation dialog for destructive actions
interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  isDanger = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-lg border border-grey-200 bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-base font-bold text-grey-800">{title}</h2>
        <p className="mb-6 text-sm text-grey-600">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-grey-200 px-4 py-2 text-sm font-semibold text-grey-600 hover:bg-grey-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-primary hover:bg-primary-dark'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
