import type { ComponentProps } from "react";

import { Button } from "../inputs/Button";

type ApproveButtonProps = Omit<ComponentProps<typeof Button>, "children" | "variant">;

export function ApproveButton(props: ApproveButtonProps) {
  return (
    <Button variant="primary" {...props}>
      Approve
    </Button>
  );
}
