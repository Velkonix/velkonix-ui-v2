import { classNames } from "../utilities/classNames";
import styles from "./Tabs.module.css";

type TabItem = {
  id: string;
  label: string;
  disabled?: boolean;
};

type TabsProps = {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
};

export function Tabs({ items, activeId, onChange }: TabsProps) {
  return (
    <div className={styles.tabs} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === activeId}
          className={classNames(styles.tab, item.id === activeId && styles.active)}
          onClick={() => onChange(item.id)}
          disabled={item.disabled}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
