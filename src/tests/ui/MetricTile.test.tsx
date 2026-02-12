import { render, screen } from "@testing-library/react";

import { Icon, MetricTile } from "../../shared/ui";

describe("MetricTile", () => {
  it("renders title and value", () => {
    render(<MetricTile title="TVL" value="$12.45M" />);

    expect(screen.getByText("TVL")).toBeInTheDocument();
    expect(screen.getByText("$12.45M")).toBeInTheDocument();
  });

  it("renders media and supports aria label", () => {
    render(
      <MetricTile
        title="Rewards"
        value="120.5 VELK"
        mediaAlt="Rewards icon"
        media={
          <Icon size={16}>
            <circle cx="8" cy="8" r="6" fill="currentColor" />
          </Icon>
        }
      />
    );

    expect(screen.getByRole("img", { name: "Rewards icon" })).toBeInTheDocument();
    expect(screen.getByText("120.5 VELK")).toBeInTheDocument();
  });

  it("applies subtle tone marker", () => {
    render(<MetricTile title="APR" value="3.42%" tone="subtle" />);

    expect(screen.getByText("APR").closest("[data-tone]")).toHaveAttribute("data-tone", "subtle");
  });
});
