import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TimeSeriesChart } from "../../shared/ui";
import type { TimeSeriesPoint } from "../../shared/ui/data-display/TimeSeriesChart.utils";

function buildSeries(length = 60): TimeSeriesPoint[] {
  const start = Date.now() - length * 24 * 60 * 60 * 1000;
  return Array.from({ length }, (_, index) => ({
    date: start + index * 24 * 60 * 60 * 1000,
    value: 1000 + index * 12,
  }));
}

function mockChartAreaBounds() {
  const chartArea = screen.getByTestId("time-series-chart-area");
  Object.defineProperty(chartArea, "getBoundingClientRect", {
    configurable: true,
    value: () =>
      ({
        left: 0,
        top: 0,
        width: 720,
        height: 280,
      }) as DOMRect,
  });
  return chartArea;
}

describe("TimeSeriesChart", () => {
  it("renders empty state when there is no data", () => {
    render(<TimeSeriesChart data={[]} />);

    expect(screen.getByText("Нет данных для графика")).toBeInTheDocument();
  });

  it("renders loading and error states", () => {
    const { rerender } = render(<TimeSeriesChart data={buildSeries()} loading />);
    expect(screen.queryByText("Ошибка графика")).not.toBeInTheDocument();

    rerender(<TimeSeriesChart data={buildSeries()} error="source unavailable" />);
    expect(screen.getByText("Ошибка графика")).toBeInTheDocument();
    expect(screen.getByText("source unavailable")).toBeInTheDocument();
  });

  it("changes period and notifies callback", async () => {
    const user = userEvent.setup();
    const handlePeriodChange = jest.fn();
    render(<TimeSeriesChart data={buildSeries(400)} onPeriodChange={handlePeriodChange} />);

    await user.click(screen.getByRole("tab", { name: "Year" }));
    expect(handlePeriodChange).toHaveBeenCalledWith("year");
    expect(screen.getByRole("tab", { name: "Year" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows marker and tooltip on hover", () => {
    render(
      <TimeSeriesChart
        data={buildSeries()}
        dateFormatter={(date) => `d:${date.getUTCDate()}`}
        valueFormatter={(value) => `v:${Math.round(value)}`}
      />
    );

    mockChartAreaBounds();
    fireEvent.mouseMove(screen.getByRole("img", { name: "Time series chart" }), { clientX: 220, clientY: 120 });

    const tooltip = screen.getByRole("status");
    expect(tooltip).toBeInTheDocument();
    expect(within(tooltip).getByText(/d:/)).toBeInTheDocument();
    expect(within(tooltip).getByText(/v:/)).toBeInTheDocument();
  });

  it("supports tap-and-hold interaction on touch", () => {
    jest.useFakeTimers();
    render(
      <TimeSeriesChart
        data={buildSeries()}
        dateFormatter={(date) => `d:${date.getUTCDate()}`}
        valueFormatter={(value) => `v:${Math.round(value)}`}
      />
    );

    const chartArea = mockChartAreaBounds();
    fireEvent.touchStart(chartArea, {
      touches: [{ clientX: 260, clientY: 120 }],
    });

    act(() => {
      jest.advanceTimersByTime(190);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    fireEvent.touchEnd(chartArea);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    jest.useRealTimers();
  });
});
