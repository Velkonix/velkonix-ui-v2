import type { ComponentProps } from "react";

import { Button } from "../inputs/Button";

type ClaimButtonProps = Omit<ComponentProps<typeof Button>, "children" | "variant">;

export function ClaimButton(props: ClaimButtonProps) {
  return (
    <Button variant="primary" {...props}>
      Claim
    </Button>
  );
}
