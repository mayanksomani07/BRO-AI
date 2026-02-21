import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { type MoodEntry, MOOD_CONFIG } from '@/lib/mood-analyzer';
import colors from '@/constants/colors';

interface MoodTrendChartProps {
  moods: MoodEntry[];
}

const MOOD_SCORES: Record<string, number> = {
  happy: 5,
  calm: 4,
  neutral: 3,
  stressed: 2,
  anxious: 1,
  sad: 0,
};

const chartWidth = Dimensions.get('window').width - 72;
const chartHeight = 120;

export function MoodTrendChart({ moods }: MoodTrendChartProps) {
  const last7 = moods.slice(0, 7).reverse();

  if (last7.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Log at least 2 moods to see your trend</Text>
      </View>
    );
  }

  const points = last7.map((entry, index) => {
    const x = (index / (last7.length - 1)) * chartWidth;
    const score = MOOD_SCORES[entry.mood] ?? 3;
    const y = chartHeight - (score / 5) * (chartHeight - 20) - 10;
    return { x, y, mood: entry.mood };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) / 3;
    const cpx2 = prev.x + (2 * (curr.x - prev.x)) / 3;
    pathD += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const areaD = pathD + ` L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={chartHeight + 10}>
        <Defs>
          <SvgGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.3" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
          </SvgGradient>
        </Defs>
        <Path d={areaD} fill="url(#areaGradient)" />
        <Path d={pathD} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={MOOD_CONFIG[p.mood as keyof typeof MOOD_CONFIG].color}
            stroke="#fff"
            strokeWidth={2}
          />
        ))}
      </Svg>
      <View style={styles.labels}>
        {last7.map((entry, i) => (
          <Text key={i} style={styles.dateLabel}>
            {new Date(entry.timestamp).toLocaleDateString('en', { weekday: 'short' }).slice(0, 3)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  emptyContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.textTertiary,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 0,
  },
  dateLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
  },
});
