import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button } from "../../shared/ui";

describe("Button", () => {
  it("fires onClick when enabled", async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(<Button onClick={handleClick}>Submit</Button>);

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disables interaction when loading", async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(
      <Button isLoading onClick={handleClick}>
        Save
      </Button>
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
