import { fireEvent, render, screen } from "@testing-library/react";

import { Modal } from "../../shared/ui";

describe("Modal", () => {
  it("renders content when open", () => {
    render(
      <Modal isOpen onClose={jest.fn()} title="APY details">
        Modal content
      </Modal>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("calls onClose when overlay clicked or escape pressed", () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen onClose={handleClose} title="APY details">
        Modal content
      </Modal>
    );

    fireEvent.click(screen.getByRole("presentation"));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(handleClose).toHaveBeenCalled();
  });
});
