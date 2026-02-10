import type { ComponentProps } from "react";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AmountInput } from "../../shared/ui";

function ControlledAmountInput(props: Partial<ComponentProps<typeof AmountInput>>) {
  const [value, setValue] = useState(props.value ?? "");

  return (
    <AmountInput
      label="Amount"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      balanceLabel="Available"
      balanceValue="25.50"
      usdValue="$25.50"
      {...props}
    />
  );
}

describe("AmountInput", () => {
  it("renders label and bottom row values", () => {
    render(<ControlledAmountInput />);

    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("25.50")).toBeInTheDocument();
    expect(screen.getByText("$25.50")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use maximum amount" })).toBeInTheDocument();
  });

  it("accepts numeric typing", async () => {
    const user = userEvent.setup();
    render(<ControlledAmountInput />);

    const input = screen.getByLabelText("Amount");
    await user.type(input, "12.34");

    expect(input).toHaveValue("12.34");
  });

  it("clears input and calls onClear", async () => {
    const user = userEvent.setup();
    const onClear = jest.fn();

    render(<ControlledAmountInput onClear={onClear} />);

    const input = screen.getByLabelText("Amount");
    await user.type(input, "18.9");

    const clearButton = screen.getByRole("button", { name: "Clear amount" });
    await user.click(clearButton);

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue("");
  });

  it("sets max value and calls onMaxClick", async () => {
    const user = userEvent.setup();
    const onMaxClick = jest.fn();

    render(<ControlledAmountInput maxValue="99.99" onMaxClick={onMaxClick} />);

    await user.click(screen.getByRole("button", { name: "Use maximum amount" }));

    expect(onMaxClick).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Amount")).toHaveValue("99.99");
  });
});
