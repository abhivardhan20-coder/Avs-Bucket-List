import React, { useEffect, useRef, useCallback } from 'react';

/**
 * Accessible Modal Primitive
 * ==========================
 * Provides focus trapping, ESC-to-close, backdrop click-to-close,
 * focus restoration, body scroll locking, and full ARIA support.
 *
 * Usage:
 *   <Modal isOpen={open} onClose={close} ariaLabel="Settings">
 *     <ModalContent />
 *   </Modal>
 */

interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal content */
  children: React.ReactNode;

  // --- Accessibility ---
  /** Text label for the dialog (used when no visible title exists) */
  ariaLabel?: string;
  /** ID of the element that labels this dialog (preferred over ariaLabel) */
  ariaLabelledBy?: string;

  // --- Behavior ---
  /** Close on Escape key press (default: true) */
  closeOnEscape?: boolean;
  /** Close when clicking the backdrop (default: true) */
  closeOnBackdropClick?: boolean;
  /** Lock body scroll when open (default: true) */
  lockBodyScroll?: boolean;

  // --- Styling ---
  /** CSS class for the backdrop overlay */
  overlayClassName?: string;
  /** CSS class for the modal content container */
  className?: string;
  /** z-index tier (default: 150) */
  zIndex?: number;
}

/**
 * Get all focusable elements within a container.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  ariaLabel,
  ariaLabelledBy,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  lockBodyScroll = true,
  overlayClassName,
  className,
  zIndex = 150,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // --- Body Scroll Lock ---
  useEffect(() => {
    if (!isOpen || !lockBodyScroll) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, lockBodyScroll]);

  // --- Focus Management: Save previous focus + auto-focus dialog ---
  useEffect(() => {
    if (!isOpen) return;

    // Save the element that was focused before the modal opened
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the dialog container itself (it has tabIndex={-1})
    // This ensures screen readers announce the dialog
    requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    // Restore focus when modal closes
    return () => {
      // Use setTimeout to allow the closing animation to complete
      const elementToRestore = previousFocusRef.current;
      if (elementToRestore && typeof elementToRestore.focus === 'function') {
        setTimeout(() => elementToRestore.focus(), 0);
      }
    };
  }, [isOpen]);

  // --- Keyboard Handling: Escape + Focus Trap ---
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Escape key
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      // Focus trap: Tab / Shift+Tab
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = getFocusableElements(dialogRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: if on first element, wrap to last
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [closeOnEscape, onClose]
  );

  // --- Backdrop Click ---
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // Only close if the click was on the backdrop itself, not the content
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  if (!isOpen) return null;

  const overlayClasses = overlayClassName || 'bg-black/70 backdrop-blur-sm';
  const contentClasses = className || '';

  return (
    /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledBy}
      tabIndex={-1}
      className={`fixed inset-0 flex items-center justify-center ${overlayClasses} outline-none`}
      style={{ zIndex }}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={contentClasses}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
