import { useEffect, useMemo, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  ReactNode,
  TouchEvent as ReactTouchEvent,
} from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "../feedback/EmptyState";
import { ErrorState } from "../feedback/ErrorState";
import { Skeleton } from "../feedback/Skeleton";
import { Typography } from "../foundation/Typography";
import { classNames } from "../utilities/classNames";
import {
  clamp,
  DEFAULT_PERIODS,
  filterByPeriod,
  formatCompactNumber,
  formatDateLabel,
  getValueDomain,
  normalizeTimeSeries,
} from "./TimeSeriesChart.utils";
import type {
  ChartPeriod,
  NormalizedTimeSeriesPoint,
  TimeSeriesPoint,
} from "./TimeSeriesChart.utils";
import styles from "./TimeSeriesChart.module.css";

const PERIOD_LABELS: Record<ChartPeriod, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
  max: "Max",
};

const CHART_MARGIN = { top: 12, right: 10, bottom: 20, left: 10 } as const;
const DEFAULT_WIDTH = 720;
const MIN_WIDTH = 280;
const HOLD_DELAY_MS = 180;

type TimeSeriesChartProps = {
  data: TimeSeriesPoint[];
  periods?: ChartPeriod[];
  defaultPeriod?: ChartPeriod;
  onPeriodChange?: (period: ChartPeriod) => void;
  valueFormatter?: (value: number) => string;
  dateFormatter?: (date: Date, period: ChartPeriod) => string;
  ariaLabel?: string;
  height?: number;
  loading?: boolean;
  error?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  className?: string;
  title?: ReactNode;
};

type ActiveState = {
  index: number;
  x: number;
  y: number;
};

function getFirstTouch(touches: {
  item?: (index: number) => unknown;
  [index: number]: unknown;
}): { clientX: number; clientY: number } | null {
  const touch = typeof touches.item === "function" ? touches.item(0) : touches[0];
  if (
    typeof touch === "object" &&
    touch !== null &&
    "clientX" in touch &&
    "clientY" in touch &&
    typeof (touch as { clientX: unknown }).clientX === "number" &&
    typeof (touch as { clientY: unknown }).clientY === "number"
  ) {
    return {
      clientX: (touch as { clientX: number }).clientX,
      clientY: (touch as { clientY: number }).clientY,
    };
  }
  return null;
}

function pickMarkerFromOffset(
  offsetX: number,
  width: number,
  points: NormalizedTimeSeriesPoint[]
): number | null {
  if (points.length === 0) {
    return null;
  }
  const yAxisWidth = 54;
  const plotLeft = CHART_MARGIN.left + yAxisWidth;
  const innerWidth = width - plotLeft - CHART_MARGIN.right;
  if (innerWidth <= 0) {
    return null;
  }
  const normalizedX = clamp(offsetX - plotLeft, 0, innerWidth);
  const ratio = innerWidth === 0 ? 0 : normalizedX / innerWidth;
  const index = points.length === 1 ? 0 : Math.round(ratio * (points.length - 1));
  return index;
}

export function TimeSeriesChart({
  data,
  periods = DEFAULT_PERIODS,
  defaultPeriod = "month",
  onPeriodChange,
  valueFormatter = formatCompactNumber,
  dateFormatter = formatDateLabel,
  ariaLabel = "Time series chart",
  height = 280,
  loading = false,
  error,
  emptyTitle = "Нет данных для графика",
  emptyDescription = "Попробуйте выбрать другой период или обновить источник данных.",
  className,
  title,
}: TimeSeriesChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const [chartWidth, setChartWidth] = useState(DEFAULT_WIDTH);
  const [activePeriod, setActivePeriod] = useState<ChartPeriod>(defaultPeriod);
  const [activeState, setActiveState] = useState<ActiveState | null>(null);
  const [isTouchHolding, setIsTouchHolding] = useState(false);

  const normalized = useMemo(() => {
    return normalizeTimeSeries(data);
  }, [data]);

  const safePeriod = periods.includes(activePeriod) ? activePeriod : (periods[0] ?? "max");
  const filtered = useMemo(() => filterByPeriod(normalized, safePeriod), [normalized, safePeriod]);

  const valuesDomain = useMemo(() => getValueDomain(filtered), [filtered]);
  const activePoint = activeState ? filtered[activeState.index] : null;
  const showTooltipOnLeft = activeState ? activeState.x > chartWidth * 0.6 : false;

  useEffect(() => {
    const element = chartRef.current;
    if (!element) {
      return;
    }
    const updateWidth = () => {
      const nextWidth = Math.max(MIN_WIDTH, Math.round(element.getBoundingClientRect().width));
      setChartWidth(nextWidth);
    };
    updateWidth();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      updateWidth();
      setActiveState(null);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const setPeriod = (period: ChartPeriod) => {
    setActiveState(null);
    setActivePeriod(period);
    onPeriodChange?.(period);
  };

  const updateFromClientX = (clientX: number) => {
    const element = chartRef.current;
    if (!element) {
      return;
    }
    const bounds = element.getBoundingClientRect();
    const index = pickMarkerFromOffset(clientX - bounds.left, chartWidth, filtered);
    if (index === null) {
      setActiveState(null);
      return;
    }
    const yAxisWidth = 54;
    const plotLeft = CHART_MARGIN.left + yAxisWidth;
    const innerWidth = chartWidth - plotLeft - CHART_MARGIN.right;
    const innerHeight = height - CHART_MARGIN.top - CHART_MARGIN.bottom;
    if (innerWidth <= 0 || innerHeight <= 0) {
      setActiveState(null);
      return;
    }
    const x =
      plotLeft +
      (filtered.length <= 1
        ? innerWidth / 2
        : (index / Math.max(1, filtered.length - 1)) * innerWidth);
    const point = filtered[index];
    const [domainMin, domainMax] = valuesDomain;
    const yRatio =
      domainMax === domainMin ? 0.5 : (point.value - domainMin) / (domainMax - domainMin);
    const y = CHART_MARGIN.top + (1 - yRatio) * innerHeight;
    setActiveState({ index, x, y });
  };

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    clearHoldTimer();
    const touch = getFirstTouch(event.touches);
    if (!touch) {
      return;
    }
    holdTimerRef.current = window.setTimeout(() => {
      setIsTouchHolding(true);
      updateFromClientX(touch.clientX);
    }, HOLD_DELAY_MS);
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!isTouchHolding) {
      return;
    }
    const touch = getFirstTouch(event.touches);
    if (!touch) {
      return;
    }
    updateFromClientX(touch.clientX);
  };

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (isTouchHolding) {
      return;
    }
    updateFromClientX(event.clientX);
  };

  const handlePointerEnd = () => {
    clearHoldTimer();
    setIsTouchHolding(false);
    setActiveState(null);
  };

  if (loading) {
    return (
      <div className={classNames(styles.root, className)}>
        <div className={styles.header}>
          <Skeleton width={260} height={28} />
        </div>
        <Skeleton width="100%" height={height} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={classNames(styles.root, className)}>
        <ErrorState title="Ошибка графика" description={error} />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className={classNames(styles.root, className)}>
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={classNames(styles.root, className)}>
      <div className={styles.header}>
        {title ? (
          <Typography as="span" variant="label" className={styles.title}>
            {title}
          </Typography>
        ) : null}
        <div className={styles.periods} role="tablist" aria-label="Период графика">
          {periods.map((period) => (
            <button
              key={period}
              type="button"
              role="tab"
              aria-selected={safePeriod === period}
              className={classNames(
                styles.periodButton,
                safePeriod === period && styles.periodButtonActive
              )}
              onClick={() => setPeriod(period)}
            >
              {PERIOD_LABELS[period]}
            </button>
          ))}
        </div>
      </div>

      <div
        className={styles.chartArea}
        ref={chartRef}
        data-testid="time-series-chart-area"
        onMouseMove={handleMouseMove}
        onMouseLeave={handlePointerEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handlePointerEnd}
        onTouchCancel={handlePointerEnd}
      >
        <LineChart
          width={chartWidth}
          height={height}
          data={filtered}
          margin={CHART_MARGIN}
          role="img"
          aria-label={ariaLabel}
        >
          <CartesianGrid
            stroke="rgba(var(--border-subtle-rgb), 0.35)"
            strokeDasharray="3 6"
            vertical={false}
          />
          <XAxis
            dataKey="timestamp"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tickMargin={8}
            ticks={filtered.map((point) => point.timestamp)}
            tick={{ fill: "rgba(var(--text-muted-rgb), 0.95)", fontSize: 12 }}
            tickFormatter={(value) => dateFormatter(new Date(value), safePeriod)}
          />
          <YAxis
            domain={valuesDomain}
            width={54}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tick={{ fill: "rgba(var(--text-muted-rgb), 0.95)", fontSize: 12 }}
            tickFormatter={valueFormatter}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="rgba(var(--accent-primary-rgb), 1)"
            strokeWidth={2.4}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          {activePoint ? (
            <>
              <ReferenceLine
                x={activePoint.timestamp}
                stroke="rgba(var(--accent-primary-rgb), 0.85)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
              />
              <ReferenceDot
                x={activePoint.timestamp}
                y={activePoint.value}
                r={5}
                fill="rgba(var(--accent-primary-rgb), 0.38)"
                stroke="rgba(var(--accent-primary-rgb), 0.9)"
                strokeWidth={1.6}
                ifOverflow="extendDomain"
              />
              <ReferenceDot
                x={activePoint.timestamp}
                y={activePoint.value}
                r={2.5}
                fill="rgba(var(--surface-highlight-rgb), 0.94)"
                stroke="none"
                ifOverflow="extendDomain"
              />
            </>
          ) : null}
        </LineChart>

        {activePoint && activeState ? (
          <div
            className={classNames(
              styles.tooltip,
              showTooltipOnLeft ? styles.tooltipLeft : styles.tooltipRight
            )}
            style={{ left: activeState.x, top: activeState.y }}
            role="status"
            aria-live="polite"
          >
            <Typography as="span" variant="microcaption" muted>
              {dateFormatter(activePoint.date, safePeriod)}
            </Typography>
            <Typography as="span" variant="label">
              {valueFormatter(activePoint.value)}
            </Typography>
          </div>
        ) : null}
      </div>
    </div>
  );
}
