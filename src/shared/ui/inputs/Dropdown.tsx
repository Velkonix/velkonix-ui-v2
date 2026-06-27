import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Dropdown.module.css";

type DropdownOption = {
  value: string;
  label: string;
};

type DropdownProps = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function Dropdown({
  value,
  options,
  onChange,
  className,
  ariaLabel,
  placeholder = "Select",
  disabled = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const selected = options.find((option) => option.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((option) => option.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, options, value]);

  const commit = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        setActiveIndex((prev) => {
          const next = event.key === "ArrowDown" ? prev + 1 : prev - 1;
          return Math.min(options.length - 1, Math.max(0, next));
        });
        break;
      }
      case "Enter":
      case " ": {
        event.preventDefault();
        if (open) commit(activeIndex);
        else setOpen(true);
        break;
      }
      case "Escape":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className={classNames(styles.root, className)}>
      <button
        type="button"
        className={classNames(styles.control, open && styles.open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className={classNames(styles.value, !selected && styles.placeholder)}>
          {selected ? selected.label : placeholder}
        </span>
        <span className={styles.caret} aria-hidden="true" />
      </button>
      {open && (
        <ul className={styles.list} role="listbox" id={listId} aria-label={ariaLabel}>
          {options.map((option, index) => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                className={classNames(
                  styles.option,
                  option.value === value && styles.optionSelected,
                  index === activeIndex && styles.optionActive
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(index)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
