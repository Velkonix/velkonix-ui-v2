import type { ButtonHTMLAttributes } from "react";

import { Button } from "../inputs/Button";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function ActionButton({ label, ...props }: ActionButtonProps) {
  return (
    <Button variant="primary" {...props}>
      {label}
    </Button>
  );
}
