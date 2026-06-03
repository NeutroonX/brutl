import { useState } from 'react';
import { View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';

import { BrutlText } from '@/components/ui/BrutlText';
import { BrutlColors } from '@/constants/theme';

export interface ChartPoint {
  value: number;
  label: string;
  isPR?: boolean;
}

interface Props {
  data: ChartPoint[];
  height?: number;
  lineColor?: string;
  dotSize?: number;
  emptyText?: string;
  yPad?: number;
}

const PT = 8;  // top padding
const PB = 22; // bottom padding for x-axis labels

export function LineChart({
  data,
  height = 120,
  lineColor = BrutlColors.accent,
  dotSize = 5,
  emptyText = 'No data yet.',
  yPad = 0,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const [width, setWidth] = useState(screenW - 72);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (!data.length) {
    return (
      <View onLayout={onLayout} style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <BrutlText style={{ fontSize: 11, color: BrutlColors.textDisabled, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 8 }}>
          {emptyText}
        </BrutlText>
      </View>
    );
  }

  const vals = data.map((d) => d.value);
  const vMin = Math.min(...vals) - yPad;
  const vMax = Math.max(...vals) + yPad;
  const range = Math.max(vMax - vMin, 1);

  const W = width;
  const H = height - PT - PB;

  const xOf = (i: number) =>
    data.length > 1 ? (i / (data.length - 1)) * W : W / 2;
  const yOf = (v: number) => PT + (1 - (v - vMin) / range) * H;

  const pts = data.map((d, i) => ({ ...d, px: xOf(i), py: yOf(d.value) }));

  // Show at most ~5 x-axis labels spread evenly
  const labelStep = data.length <= 5 ? 1 : Math.ceil((data.length - 1) / 4);
  const showLabel = (i: number) =>
    i === 0 || i === data.length - 1 || i % labelStep === 0;

  return (
    <View onLayout={onLayout}>
      <View style={{ width, height }}>
        {/* Grid lines */}
        {[0, 0.5, 1].map((t) => (
          <View
            key={t}
            style={{
              position: 'absolute',
              left: 0,
              top: PT + (1 - t) * H,
              width: W,
              height: 0.5,
              backgroundColor: BrutlColors.border,
            }}
          />
        ))}

        {/* Line segments — each segment is a rotated View */}
        {pts.slice(1).map((pt, i) => {
          const prev = pts[i];
          const dx = pt.px - prev.px;
          const dy = pt.py - prev.py;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 0.5) return null;
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                width: len,
                height: 2,
                left: (prev.px + pt.px) / 2 - len / 2,
                top: (prev.py + pt.py) / 2 - 1,
                backgroundColor: lineColor,
                borderRadius: 1,
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}

        {/* Dots */}
        {pts.map((pt, i) => {
          const sz = pt.isPR ? dotSize * 1.8 : dotSize;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                width: sz,
                height: sz,
                borderRadius: sz / 2,
                backgroundColor: lineColor,
                left: pt.px - sz / 2,
                top: pt.py - sz / 2,
                borderWidth: pt.isPR ? 2 : 0,
                borderColor: '#fff',
              }}
            />
          );
        })}

        {/* PR labels */}
        {pts
          .filter((p) => p.isPR)
          .map((pt, i) => (
            <BrutlText
              key={i}
              style={{
                position: 'absolute',
                fontSize: 8,
                color: BrutlColors.accent,
                letterSpacing: 0.5,
                left: pt.px - 8,
                top: pt.py - 16,
              }}
            >
              PR
            </BrutlText>
          ))}

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (!showLabel(i)) return null;
          return (
            <BrutlText
              key={i}
              style={{
                position: 'absolute',
                fontSize: 9,
                color: BrutlColors.textDisabled,
                left: xOf(i) - 20,
                top: height - PB + 4,
                width: 40,
                textAlign: 'center',
              }}
            >
              {d.label}
            </BrutlText>
          );
        })}
      </View>
    </View>
  );
}
