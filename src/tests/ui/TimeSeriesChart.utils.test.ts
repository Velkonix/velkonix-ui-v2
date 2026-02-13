import {
  filterByPeriod,
  formatCompactNumber,
  getValueDomain,
  normalizeTimeSeries,
} from "../../shared/ui/data-display/TimeSeriesChart.utils";

describe("TimeSeriesChart utils", () => {
  it("normalizes and sorts data while dropping invalid points", () => {
    const points = normalizeTimeSeries([
      { date: "2025-01-03T00:00:00.000Z", value: 10 },
      { date: "broken-date", value: 12 },
      { date: "2025-01-01T00:00:00.000Z", value: 8 },
      { date: "2025-01-02T00:00:00.000Z", value: Number.NaN },
    ]);

    expect(points).toHaveLength(2);
    expect(points[0].value).toBe(8);
    expect(points[1].value).toBe(10);
  });

  it("filters points by selected period", () => {
    const base = Date.parse("2026-01-01T00:00:00.000Z");
    const points = normalizeTimeSeries(
      Array.from({ length: 370 }, (_, index) => ({
        date: base + index * 24 * 60 * 60 * 1000,
        value: index,
      }))
    );

    const week = filterByPeriod(points, "week");
    const month = filterByPeriod(points, "month");
    const year = filterByPeriod(points, "year");
    const max = filterByPeriod(points, "max");

    expect(week.length).toBeLessThan(month.length);
    expect(month.length).toBeLessThan(year.length);
    expect(year.length).toBeLessThan(max.length);
  });

  it("creates safe domain for flat values", () => {
    const [min, max] = getValueDomain(
      normalizeTimeSeries([
        { date: "2026-01-01T00:00:00.000Z", value: 420 },
        { date: "2026-01-02T00:00:00.000Z", value: 420 },
      ])
    );
    expect(min).toBeLessThan(420);
    expect(max).toBeGreaterThan(420);
  });

  it("formats compact numbers", () => {
    const formatted = formatCompactNumber(12_400);
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });
});
