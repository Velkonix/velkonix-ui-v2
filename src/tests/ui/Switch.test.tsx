import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Switch } from "../../shared/ui";

describe("Switch", () => {
  it("toggles checked state", async () => {
    const user = userEvent.setup();
    render(<Switch label="Use collateral" />);

    const checkbox = screen.getByLabelText("Use collateral");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
