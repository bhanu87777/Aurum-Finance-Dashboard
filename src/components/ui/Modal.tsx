"use client";

import { useEffect, useRef } from "react";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

// Centered dialog on the native <dialog> element — focus trap, Esc, and
// top-layer stacking come free from the platform.
export function Modal({
  open,
  onClose,
  title,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: keyof typeof SIZES;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dlg m-auto w-[calc(100vw-2rem)] ${SIZES[size]}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clicks on the backdrop land on the <dialog> element itself.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="panel p-6">
        {title && (
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-xl">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="btn-ghost rounded-lg px-2.5 py-1 text-sm"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
