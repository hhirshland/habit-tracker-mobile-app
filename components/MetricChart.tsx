import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Polyline,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Path,
  Text as SvgText,
} from 'react-native-svg';
import { theme } from '@/lib/theme';
import { MetricDataPoint } from '@/lib/health';

interface MetricChartProps {
  data: MetricDataPoint[];
  width?: number;
  height?: number;
  color?: string;
  unit?: string;
}

export default function MetricChart({
  data,
  width = 320,
  height = 200,
  color = theme.colors.primary,
  unit = '',
}: MetricChartProps) {
  const padding = { top: 16, right: 16, bottom: 28, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { points, xMin, xMax, yMin, yMax } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
    }

    const parsed = data
      .map((d) => ({
        dateMs: new Date(d.date).getTime(),
        value: d.value,
      }))
      .sort((a, b) => a.dateMs - b.dateMs);

    const allValues = parsed.map((p) => p.value);
    const valMin = Math.min(...allValues);
    const valMax = Math.max(...allValues);
    const valRange = valMax - valMin || 1;

    return {
      points: parsed,
      xMin: parsed[0].dateMs,
      xMax: parsed[parsed.length - 1].dateMs,
      yMin: valMin - valRange * 0.05,
      yMax: valMax + valRange * 0.05,
    };
  }, [data]);

  const xScale = (dateMs: number) => {
    const range = xMax - xMin || 1;
    return padding.left + ((dateMs - xMin) / range) * chartWidth;
  };

  const yScale = (value: number) => {
    const range = yMax - yMin || 1;
    return padding.top + chartHeight - ((value - yMin) / range) * chartHeight;
  };

  // Y-axis ticks (4 evenly spaced)
  const yTicks = useMemo(() => {
    const range = yMax - yMin;
    const count = 4;
    const step = range / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const val = yMin + step * i;
      return { value: val, y: yScale(val) };
    });
  }, [yMin, yMax, chartHeight]);

  // X-axis ticks (start, middle, end)
  const xTicks = useMemo(() => {
    const dates = [xMin, (xMin + xMax) / 2, xMax];
    return dates.map((ms) => {
      const d = new Date(ms);
      return { label: `${d.getMonth() + 1}/${d.getDate()}`, x: xScale(ms) };
    });
  }, [xMin, xMax, chartWidth]);

  // No data state
  if (data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No data yet</Text>
        </View>
      </View>
    );
  }

  // Build SVG line points
  const linePoints = points
    .map((p) => `${xScale(p.dateMs)},${yScale(p.value)}`)
    .join(' ');

  // Build area path (line → bottom-right → bottom-left → close)
  const areaPath =
    points.length >= 2
      ? `M ${xScale(points[0].dateMs)},${yScale(points[0].value)} ` +
        points
          .slice(1)
          .map((p) => `L ${xScale(p.dateMs)},${yScale(p.value)}`)
          .join(' ') +
        ` L ${xScale(points[points.length - 1].dateMs)},${padding.top + chartHeight} ` +
        `L ${xScale(points[0].dateMs)},${padding.top + chartHeight} Z`
      : '';

  const lastPoint = points[points.length - 1];

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.25" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        {yTicks.map((tick, i) => (
          <Line
            key={`grid-${i}`}
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke={theme.colors.borderLight}
            strokeWidth={1}
          />
        ))}

        {/* Area fill */}
        {areaPath ? <Path d={areaPath} fill="url(#areaGradient)" /> : null}

        {/* Data line */}
        {points.length >= 2 && (
          <Polyline
            points={linePoints}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* End dot */}
        {lastPoint && (
          <Circle
            cx={xScale(lastPoint.dateMs)}
            cy={yScale(lastPoint.value)}
            r={4}
            fill={color}
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
            fill={theme.colors.textMuted}
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
            fill={theme.colors.textMuted}
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
  if (value === 0) return '0';
  return value.toFixed(1);
}

const styles = StyleSheet.create({
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
    color: theme.colors.textMuted,
  },
});
