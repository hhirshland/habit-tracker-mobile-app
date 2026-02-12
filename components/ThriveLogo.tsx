import React from 'react';
import Svg, { Rect } from 'react-native-svg';

interface ThriveLogoProps {
  size?: number;
  style?: object;
}

/**
 * Thrive app logo — three ascending capsule shapes representing
 * growth, progress, and building better habits.
 *
 * Uses shades of the primary purple (#6C63FF).
 */
export default function ThriveLogo({ size = 40, style }: ThriveLogoProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      style={style}
    >
      <Rect x="88" y="316" width="88" height="120" rx="44" fill="#AAA7FF" />
      <Rect x="212" y="196" width="88" height="240" rx="44" fill="#8B85FF" />
      <Rect x="336" y="76" width="88" height="360" rx="44" fill="#6C63FF" />
    </Svg>
  );
}
