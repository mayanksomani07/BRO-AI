import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'victory-native';
import { getMoodColor, COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');

interface MoodChartProps {
  data: { score: number; date: number }[];
}

export default function MoodChart({ data }: MoodChartProps) {
  if (!data || data.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Not enough data yet</Text>
      </View>
    );
  }

  const chartData = data.map((d, i) => ({ x: i + 1, y: d.score }));
  const latestScore = data[data.length - 1]?.score ?? 5;
  const lineColor = getMoodColor(latestScore);

  const days = data.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString([], { weekday: 'short' });
  });

  return (
    <View style={styles.container}>
      <LineChart
        data={chartData}
        width={width - 80}
        height={110}
        style={{ overflow: 'visible' }}
        domainPadding={{ y: [10, 10] }}
      />
      <View style={styles.xLabels}>
        {days.map((day, i) => (
          <Text key={i} style={styles.xLabel}>{day}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  empty: { height: 80, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 13 },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4 },
  xLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', flex: 1 },
});
