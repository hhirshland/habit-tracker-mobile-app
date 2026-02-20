import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Circle, Polygon, Text as SvgText } from 'react-native-svg';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import type { ThemeColors } from '@/lib/theme';
import { MetricDataPoint } from '@/lib/health';
import {
  TrajectoryPoint,
  ProjectionPoint,
} from '@/lib/goalMath';

interface GoalChartProps {
  /** Actual measured data points */
  actualData: MetricDataPoint[];
  /** Goal trajectory line (ideal path) */
  trajectory?: TrajectoryPoint[];
  /** Trend projection with confidence band */
  projection?: ProjectionPoint[];
  /** Chart dimensions */
  width?: number;
  height?: number;
  /** Colors */
  actualColor?: string;
  goalColor?: string;
  projectionColor?: string;
  /** Unit label for Y-axis */
  unit?: string;
  /** Explicit x-axis start date (ISO string). If set, overrides auto-computed min. */
  goalStartDate?: string;
  /** Explicit x-axis end date (ISO string). If set, overrides auto-computed max. */
  goalEndDate?: string;
}

interface DateValue {
  dateMs: number;
  value: number;
}

export default function GoalChart({
  actualData,
  trajectory = [],
  projection = [],
  width = 320,
  height = 200,
  actualColor,
  goalColor,
  projectionColor,
  unit = '',
  goalStartDate,
  goalEndDate,
}: GoalChartProps) {
  const colors = useThemeColors();
  const resolvedActualColor = actualColor ?? colors.primary;
  const resolvedGoalColor = goalColor ?? colors.success;
  const resolvedProjectionColor = projectionColor ?? colors.primaryLight;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const padding = { top: 16, right: 16, bottom: 28, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Convert all data to numeric for unified scale computation
  const { allPoints, actualPoints, trajectoryPoints, projectionPoints, xMin, xMax, yMin, yMax } =
    useMemo(() => {
      const msPerDay = 86400000;

      const parsePoints = (pts: { date: string; value: number }[]): DateValue[] =>
        pts.map((p) => ({ dateMs: new Date(p.date).getTime(), value: p.value }));

      const ap = parsePoints(actualData);
      const tp = parsePoints(trajectory);
      const pp = projection.map((p) => ({
        dateMs: new Date(p.date).getTime(),
        predicted: p.predicted,
        upper: p.upper,
        lower: p.lower,
      }));

      // Gather all date/value combos for scale
      const allDates: number[] = [
        ...ap.map((p) => p.dateMs),
        ...tp.map((p) => p.dateMs),
        ...pp.map((p) => p.dateMs),
      ];
      const allValues: number[] = [
        ...ap.map((p) => p.value),
        ...tp.map((p) => p.value),
        ...pp.map((p) => p.predicted),
        ...pp.map((p) => p.upper),
        ...pp.map((p) => p.lower),
      ];

      if (allDates.length === 0 || allValues.length === 0) {
        return {
          allPoints: [],
          actualPoints: [],
          trajectoryPoints: [],
          projectionPoints: [],
          xMin: 0,
          xMax: 1,
          yMin: 0,
          yMax: 1,
        };
      }

      const dataDateMin = Math.min(...allDates);
      const dataDateMax = Math.max(...allDates);
      const valMin = Math.min(...allValues);
      const valMax = Math.max(...allValues);

      // Use explicit bounds when provided, otherwise fall back to data bounds
      const dateMin = goalStartDate
        ? new Date(goalStartDate).getTime()
        : dataDateMin;
      const dateMax = goalEndDate
        ? new Date(goalEndDate).getTime()
        : dataDateMax;

      // Add 5% padding to value range
      const valRange = valMax - valMin || 1;
      const yPad = valRange * 0.05;

      return {
        allPoints: [],
        actualPoints: ap,
        trajectoryPoints: tp,
        projectionPoints: pp,
        xMin: dateMin,
        xMax: dateMax || dateMin + msPerDay,
        yMin: valMin - yPad,
        yMax: valMax + yPad,
      };
    }, [actualData, trajectory, projection, goalStartDate, goalEndDate]);

  // Coordinate mappers
  const xScale = (dateMs: number) => {
    const range = xMax - xMin || 1;
    return padding.left + ((dateMs - xMin) / range) * chartWidth;
  };

  const yScale = (value: number) => {
    const range = yMax - yMin || 1;
    return padding.top + chartHeight - ((value - yMin) / range) * chartHeight;
  };

  // Build SVG point strings
  const actualSvgPoints = actualPoints
    .map((p) => `${xScale(p.dateMs)},${yScale(p.value)}`)
    .join(' ');

  const trajectorySvgPoints = trajectoryPoints
    .map((p) => `${xScale(p.dateMs)},${yScale(p.value)}`)
    .join(' ');

  // Projection band polygon (upper line forward, lower line backward)
  const projBandPoints = projectionPoints.length > 0
    ? [
        ...projectionPoints.map((p) => `${xScale(p.dateMs)},${yScale(p.upper)}`),
        ...projectionPoints.slice().reverse().map((p) => `${xScale(p.dateMs)},${yScale(p.lower)}`),
      ].join(' ')
    : '';

  const projLinePoints = projectionPoints
    .map((p) => `${xScale(p.dateMs)},${yScale(p.predicted)}`)
    .join(' ');

  // Y-axis labels (3-4 ticks)
  const yTicks = useMemo(() => {
    const range = yMax - yMin;
    const tickCount = 4;
    const step = range / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) => {
      const val = yMin + step * i;
      return { value: val, y: yScale(val) };
    });
  }, [yMin, yMax, chartHeight]);

  // X-axis labels (start, middle, end)
  const xTicks = useMemo(() => {
    const ticks: { label: string; x: number }[] = [];
    const dates = [xMin, (xMin + xMax) / 2, xMax];
    for (const ms of dates) {
      const d = new Date(ms);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      ticks.push({ label, x: xScale(ms) });
    }
    return ticks;
  }, [xMin, xMax, chartWidth]);

  // No data state
  if (actualPoints.length === 0 && trajectoryPoints.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No data yet</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <Line
            key={`grid-${i}`}
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke={colors.borderLight}
            strokeWidth={1}
          />
        ))}

        {/* Projection area (filled band showing variance) */}
        {projBandPoints && (
          <Polygon
            points={projBandPoints}
            fill={resolvedProjectionColor}
            opacity={0.25}
          />
        )}

        {/* Projection center trend line (thin, inside the area) */}
        {projLinePoints && projectionPoints.length >= 2 && (
          <Polyline
            points={projLinePoints}
            fill="none"
            stroke={resolvedProjectionColor}
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.5}
          />
        )}

        {/* Goal trajectory line (dashed) */}
        {trajectorySvgPoints && trajectoryPoints.length >= 2 && (
          <Polyline
            points={trajectorySvgPoints}
            fill="none"
            stroke={resolvedGoalColor}
            strokeWidth={2}
            strokeDasharray="6,4"
            strokeLinecap="round"
          />
        )}

        {/* Actual data line */}
        {actualSvgPoints && actualPoints.length >= 2 && (
          <Polyline
            points={actualSvgPoints}
            fill="none"
            stroke={resolvedActualColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Actual data end dot */}
        {actualPoints.length > 0 && (
          <Circle
            cx={xScale(actualPoints[actualPoints.length - 1].dateMs)}
            cy={yScale(actualPoints[actualPoints.length - 1].value)}
            r={4}
            fill={resolvedActualColor}
          />
        )}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <SvgText
            key={`ylabel-${i}`}
            x={padding.left - 6}
            y={tick.y + 4}
            textAnchor="end"
            fontSize={10}
            fill={colors.textMuted}
          >
            {formatTickValue(tick.value, unit)}
          </SvgText>
        ))}

        {/* X-axis labels */}
        {xTicks.map((tick, i) => (
          <SvgText
            key={`xlabel-${i}`}
            x={tick.x}
            y={height - 6}
            textAnchor="middle"
            fontSize={10}
            fill={colors.textMuted}
          >
            {tick.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function formatTickValue(value: number, unit: string): string {
  if (unit === 'steps' && value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  if (value >= 100) return Math.round(value).toString();
  return value.toFixed(1);
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
    },
    noData: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noDataText: {
      fontSize: theme.fontSize.sm,
      color: colors.textMuted,
    },
  });
}
