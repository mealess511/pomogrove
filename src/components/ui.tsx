import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="toggle"
      data-on={checked ? 'true' : 'false'}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  );
}

interface StepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  label: string;
  onChange: (value: number) => void;
}

export function Stepper({
  value,
  min,
  max,
  step = 1,
  unit,
  label,
  onChange,
}: StepperProps) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        className="stepper-button"
        aria-label={`减少${label}`}
        disabled={value <= min}
        onClick={() => set(value - step)}
      >
        −
      </button>
      <span className="stepper-value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      <button
        type="button"
        className="stepper-button"
        aria-label={`增加${label}`}
        disabled={value >= max}
        onClick={() => set(value + step)}
      >
        +
      </button>
    </div>
  );
}

interface TomatoDotsProps {
  total: number;
  filled: number;
  max?: number;
}

export function TomatoDots({ total, filled, max = 8 }: TomatoDotsProps) {
  const shown = Math.min(total, max);
  return (
    <div className="tomato-dots" aria-label={`本轮已完成 ${filled} / ${total} 个番茄`}>
      {Array.from({ length: shown }, (_, index) => (
        <span
          key={index}
          className="tomato-dot"
          data-filled={index < filled ? 'true' : 'false'}
        />
      ))}
      {total > max && <span className="tomato-dots-more">+{total - max}</span>}
    </div>
  );
}

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function IconButton({ label, onClick, children, className, disabled }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button ${className ?? ''}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, subtitle, children, footer, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="modal-layer">
      <button type="button" className="modal-backdrop" aria-label="关闭弹窗" onClick={onClose} />
      <div
        className="modal"
        data-wide={wide ? 'true' : 'false'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton label="关闭" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}
