/**
 * MoodRing — animated SVG ring showing mood score
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { getMoodColor } from '../constants/theme';

interface MoodRingProps {
  score: number;   // 1.0–10.0
  size?: number;
}

export default function MoodRing({ score, size = 160 }: MoodRingProps) {
  const animatedScore = useRef(new Animated.Value(0)).current;
  const strokeWidth = size * 0.075;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = getMoodColor(score);
  const percentage = (score - 1) / 9; // normalize 1–10 to 0–1

  useEffect(() => {
    Animated.spring(animatedScore, {
      toValue: percentage,
      damping: 12,
      stiffness: 80,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = animatedScore.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="moodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.6} />
            <Stop offset="100%" stopColor={color} stopOpacity={1} />
          </SvgLinearGradient>
        </Defs>
        {/* Background track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={`url(#moodGrad)`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {/* Center score */}
      <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.score, { color }]}>{score.toFixed(1)}</Text>
        <Text style={styles.scoreLabel}>/10</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  score: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  scoreLabel: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: -2 },
});
