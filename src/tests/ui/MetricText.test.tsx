import { render, screen } from "@testing-library/react";

import { MetricText } from "../../shared/ui";

describe("MetricText", () => {
  it("renders title and value", () => {
    render(<MetricText title="Reserve size" value="4,218.00 ETH" />);

    expect(screen.getByText("Reserve size")).toBeInTheDocument();
    expect(screen.getByText("4,218.00 ETH")).toBeInTheDocument();
  });

  it("renders optional icon", () => {
    render(
      <MetricText
        title="Ethereum"
        value="ETH"
        icon={<span aria-hidden="true">E</span>}
        iconAlt="ETH icon"
      />
    );

    expect(screen.getByRole("img", { name: "ETH icon" })).toBeInTheDocument();
  });
});
