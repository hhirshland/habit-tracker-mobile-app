import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { theme } from '@/lib/theme';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  showEndDot?: boolean;
}

export default function Sparkline({
  data,
  width = 120,
  height = 40,
  color = theme.colors.primary,
  strokeWidth = 2,
  showEndDot = true,
}: SparklineProps) {
  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // avoid division by zero

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const lastPoint = points[points.length - 1].split(',');

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {showEndDot && (
          <Circle
            cx={parseFloat(lastPoint[0])}
            cy={parseFloat(lastPoint[1])}
            r={3}
            fill={color}
          />
        )}
      </Svg>
    </View>
  );
}
