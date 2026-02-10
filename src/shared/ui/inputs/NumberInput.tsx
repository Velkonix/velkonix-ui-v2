import type { InputProps } from "./Input";

import { Input } from "./Input";

export type NumberInputProps = Omit<InputProps, "type" | "inputMode">;

export function NumberInput(props: NumberInputProps) {
  return <Input type="number" inputMode="decimal" {...props} />;
}
