import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { type MoodType, MOOD_CONFIG } from '@/lib/mood-analyzer';
import colors from '@/constants/colors';

interface MoodSelectorProps {
  selectedMood: MoodType | null;
  onSelect: (mood: MoodType) => void;
}

const MOODS: MoodType[] = ['happy', 'calm', 'neutral', 'stressed', 'sad', 'anxious'];

function MoodButton({ mood, isSelected, onPress }: { mood: MoodType; isSelected: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const config = MOOD_CONFIG[mood];

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.9); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
    >
      <Animated.View
        style={[
          styles.moodBtn,
          {
            backgroundColor: isSelected ? config.color + '20' : colors.surface,
            borderColor: isSelected ? config.color : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
          animStyle,
        ]}
      >
        <Ionicons name={config.icon as any} size={28} color={config.color} />
        <Text style={[styles.moodLabel, { color: isSelected ? config.color : colors.textSecondary }]}>
          {config.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function MoodSelector({ selectedMood, onSelect }: MoodSelectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {MOODS.map(mood => (
          <MoodButton
            key={mood}
            mood={mood}
            isSelected={selectedMood === mood}
            onPress={() => onSelect(mood)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  moodBtn: {
    width: 96,
    height: 88,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  moodLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
});
