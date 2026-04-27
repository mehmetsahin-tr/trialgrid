"use client";

import { useState, useRef, useEffect } from "react";

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const strVal = String(value);
  const selected = options.find(o => o.value === strVal && strVal !== "");
  const isPlaceholder = !selected;

  return (
    <div className={`custom-select${className ? ` ${className}` : ""}`} ref={ref} style={style}>
      <button
        type="button"
        className={`custom-select-trigger${open ? " open" : ""}${isPlaceholder ? " placeholder" : ""}`}
        onClick={() => setOpen(v => !v)}
      >
        <span>{isPlaceholder ? placeholder : selected?.label}</span>
        <span className="custom-select-arrow">▾</span>
      </button>
      {open && (
        <ul className="custom-select-menu" role="listbox">
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
        </ul>
      )}
    </div>
  );
}
