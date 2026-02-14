import { classNames } from "../utilities/classNames";
import styles from "./WideSwitch.module.css";

export type WideSwitchOption<T extends string = string> = {
  value: T;
  label: string;
};

type WideSwitchProps<T extends string = string> = {
  value: T;
  options: readonly WideSwitchOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
};

export function WideSwitch<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  disabled = false,
}: WideSwitchProps<T>) {
  return (
    <div className={classNames(styles.root, className)} role="radiogroup" aria-label={ariaLabel} aria-disabled={disabled || undefined}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={classNames(styles.option, isActive ? styles.optionActive : undefined)}
            onClick={() => onChange(option.value)}
            disabled={disabled}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
