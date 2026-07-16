"use client";

import { Modal } from "./Modal";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} size="sm" title={title}>
      <div className="text-sm text-ink-secondary">{body}</div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="btn-ghost rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-opacity disabled:opacity-60 ${
            danger ? "bg-critical text-white" : "btn-gold"
          }`}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
