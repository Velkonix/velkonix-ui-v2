import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Tabs } from "../../shared/ui";

describe("Tabs", () => {
  it("marks the active tab and triggers onChange", async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(
      <Tabs
        items={[
          { id: "convert", label: "Convert" },
          { id: "stake", label: "Stake" },
        ]}
        activeId="convert"
        onChange={handleChange}
      />
    );

    expect(screen.getByRole("tab", { name: "Convert" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "Stake" }));
    expect(handleChange).toHaveBeenCalledWith("stake");
  });
});
