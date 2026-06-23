"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function Select({ value, onChange, options, placeholder, style, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => setMounted(true), []);

  const updateRect = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.bottom, width: r.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateRect();
    function onOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onReposition() {
      updateRect();
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, updateRect]);

  const strVal = String(value);
  const selected = options.find(o => o.value === strVal && strVal !== "");
  const isPlaceholder = !selected;

  return (
    <div className={`custom-select${className ? ` ${className}` : ""}`} ref={ref} style={style}>
      <button
        ref={triggerRef}
        type="button"
        className={`custom-select-trigger${open ? " open" : ""}${isPlaceholder ? " placeholder" : ""}`}
        onClick={() => setOpen(v => !v)}
      >
        <span>{isPlaceholder ? placeholder : selected?.label}</span>
        <span className="custom-select-arrow">▾</span>
      </button>
      {open && mounted && rect && createPortal(
        <ul
          ref={menuRef}
          className="custom-select-menu"
          role="listbox"
          style={{ left: rect.left, top: rect.top, width: rect.width }}
        >
          {options.map(opt => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === strVal}
              className={`custom-select-option${opt.value === strVal ? " selected" : ""}${opt.disabled ? " disabled" : ""}`}
              onClick={() => {
                if (!opt.disabled) { onChange(opt.value); setOpen(false); }
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
