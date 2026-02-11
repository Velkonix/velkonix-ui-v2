import type { ComponentProps } from "react";

import { Button } from "../inputs/Button";

type ActionButtonProps = Omit<ComponentProps<typeof Button>, "children"> & {
  label: string;
};

export function ActionButton({ label, variant = "primary", ...props }: ActionButtonProps) {
  return (
    <Button variant={variant} {...props}>
      {label}
    </Button>
  );
}
