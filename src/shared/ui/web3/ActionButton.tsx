import type { ComponentProps } from "react";

import { Button } from "../inputs/Button";

type ActionButtonProps = Omit<ComponentProps<typeof Button>, "children" | "variant"> & {
  label: string;
};

export function ActionButton({ label, ...props }: ActionButtonProps) {
  return (
    <Button variant="primary" {...props}>
      {label}
    </Button>
  );
}
