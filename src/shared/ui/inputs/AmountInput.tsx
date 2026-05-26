import type { ChangeEvent, ChangeEventHandler, InputHTMLAttributes, ReactNode } from "react";
import { useId, useRef } from "react";

import { Icon } from "../foundation/Icon";
import { classNames } from "../utilities/classNames";
import styles from "./AmountInput.module.css";

export type AmountInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  assetIcon?: ReactNode;
  assetLabel?: string;
  balanceLabel?: string;
  balanceValue?: ReactNode;
  maxValue?: string | number;
  usdValue?: ReactNode;
  onMaxClick?: () => void;
  onClear?: () => void;
  onChange?: ChangeEventHandler<HTMLInputElement>;
};

export function AmountInput({
  label,
  assetIcon,
  assetLabel = "Asset",
  balanceLabel = "Balance",
  balanceValue,
  maxValue,
  usdValue,
  onMaxClick,
  onClear,
  className,
  id,
  value,
  onChange,
  disabled,
  inputMode,
  ...props
}: AmountInputProps) {
  const generatedId = useId();
  const inputId = id ?? `amount-input-${generatedId}`;
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = String(value ?? "").length > 0;
  const hasMax = maxValue !== undefined && maxValue !== null && String(maxValue).length > 0;

  const dispatchValueChange = (nextValue: string) => {
    const inputElement = inputRef.current;
    if (!inputElement) {
      return;
    }

    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;
    valueSetter?.call(inputElement, nextValue);

    if (onChange) {
      onChange({
        target: inputElement,
        currentTarget: inputElement,
      } as ChangeEvent<HTMLInputElement>);
      return;
    }

    inputElement.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const handleClear = () => {
    dispatchValueChange("");
    onClear?.();
  };

  const handleMax = () => {
    if (!hasMax) {
      return;
    }
    dispatchValueChange(String(maxValue));
    onMaxClick?.();
  };

  return (
    <div className={classNames(styles.wrapper, className)}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}

      <div className={classNames(styles.control, disabled && styles.disabled)}>
        <div className={styles.mainRow}>
          <input
            {...props}
            id={inputId}
            ref={inputRef}
            className={styles.input}
            type="text"
            inputMode={inputMode ?? "decimal"}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />

          <div className={styles.left}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={handleClear}
              disabled={disabled || !hasValue}
              aria-label="Clear amount"
            >
              <Icon size={14}>
                <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.8" />
                <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.8" />
              </Icon>
            </button>
            <span className={styles.assetIcon} aria-hidden="true">
              {assetIcon}
            </span>
            <span className={styles.assetLabel}>{assetLabel}</span>
          </div>
        </div>

        <div className={styles.bottomRow}>
          <span className={styles.metaValue}>{usdValue}</span>
          <div className={styles.bottomLeft}>
            <span className={styles.metaText}>{balanceLabel}</span>
            {balanceValue !== undefined && <span className={styles.metaValue}>{balanceValue}</span>}
            <button
              type="button"
              className={styles.maxButton}
              onClick={handleMax}
              disabled={disabled || !hasMax}
              aria-label="Use maximum amount"
            >
              MAX
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
