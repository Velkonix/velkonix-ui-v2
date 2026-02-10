import type { ButtonHTMLAttributes } from "react";

import { Button } from "../inputs/Button";

type ApproveButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function ApproveButton(props: ApproveButtonProps) {
  return (
    <Button variant="primary" {...props}>
      Approve
    </Button>
  );
}
