import type { ButtonHTMLAttributes } from "react";

import { Button } from "../inputs/Button";

type ClaimButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function ClaimButton(props: ClaimButtonProps) {
  return (
    <Button variant="primary" {...props}>
      Claim
    </Button>
  );
}
