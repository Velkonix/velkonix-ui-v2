import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Input } from "../../shared/ui";

describe("Input", () => {
  it("renders label, hint, and accepts typing", async () => {
    const user = userEvent.setup();
    render(<Input label="Amount" hint="Enter amount" placeholder="0.00" />);

    expect(screen.getByText("Enter amount")).toBeInTheDocument();
    const input = screen.getByLabelText("Amount");
    await user.type(input, "12.5");
    expect(input).toHaveValue("12.5");
  });

  it("shows error text", () => {
    render(<Input label="Amount" error="Insufficient balance" />);
    expect(screen.getByText("Insufficient balance")).toBeInTheDocument();
  });
});
