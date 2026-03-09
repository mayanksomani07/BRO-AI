/**
 * MoodChart — simple SVG line chart using react-native-svg
 * Works in Expo Go without any native modules
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { getMoodColor, COLORS } from '../constants/theme';

interface MoodChartProps {
  data: { score: number; date: number }[];
}

const CHART_WIDTH = 300;
const CHART_HEIGHT = 110;
const PAD = { top: 10, right: 12, bottom: 26, left: 20 };

export default function MoodChart({ data }: MoodChartProps) {
  if (!data || data.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Keep logging to see your 7-day trend 📈</Text>
      </View>
    );
  }

  const innerW = CHART_WIDTH - PAD.left - PAD.right;
  const innerH = CHART_HEIGHT - PAD.top - PAD.bottom;
  const scaleY = (score: number) => PAD.top + innerH - ((score - 1) / 9) * innerH;
  const scaleX = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const points = data.map((d, i) => `${scaleX(i)},${scaleY(d.score)}`).join(' ');
  const latestScore = data[data.length - 1]?.score ?? 5;
  const lineColor = getMoodColor(latestScore);

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {[2.5, 5, 7.5].map(score => (
        <Line key={score} x1={PAD.left} y1={scaleY(score)}
          x2={CHART_WIDTH - PAD.right} y2={scaleY(score)}
          stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}
      <Polyline points={points} fill="none" stroke={lineColor}
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <Circle key={i} cx={scaleX(i)} cy={scaleY(d.score)}
          r={4} fill={getMoodColor(d.score)} stroke={COLORS.background} strokeWidth={1.5} />
      ))}
      {data.map((d, i) => (
        <SvgText key={i} x={scaleX(i)} y={CHART_HEIGHT - 5}
          fontSize={9} fill={COLORS.textMuted} textAnchor="middle">
          {new Date(d.date).toLocaleDateString([], { weekday: 'short' })}
        </SvgText>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: { height: 80, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
