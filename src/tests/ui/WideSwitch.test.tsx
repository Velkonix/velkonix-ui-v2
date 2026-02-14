import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WideSwitch } from "../../shared/ui";

describe("WideSwitch", () => {
  it("calls onChange with selected value", async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(
      <WideSwitch
        ariaLabel="Asset denomination"
        value="weth"
        options={[
          { value: "weth", label: "WETH" },
          { value: "eth", label: "ETH" },
        ]}
        onChange={handleChange}
      />
    );

    await user.click(screen.getByRole("radio", { name: "ETH" }));
    expect(handleChange).toHaveBeenCalledWith("eth");
  });
});
