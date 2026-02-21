import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useMood } from '@/lib/mood-context';
import { MoodSelector } from '@/components/MoodSelector';
import { type MoodType } from '@/lib/mood-analyzer';
import colors from '@/constants/colors';

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const { addMood } = useMood();
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const checkScale = useSharedValue(0);
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const handleSave = async () => {
    if (!selectedMood) {
      Alert.alert('Select a mood', 'Please tap on how you\'re feeling before saving.');
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await addMood(selectedMood, note.trim() || undefined);
    setSaved(true);
    checkScale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1),
    );
    setTimeout(() => {
      setSelectedMood(null);
      setNote('');
      setSaved(false);
      checkScale.value = withTiming(0, { duration: 200 });
    }, 2000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }]}
        bottomOffset={20}
      >
        <Text style={styles.title}>How are you feeling?</Text>
        <Text style={styles.subtitle}>Take a moment to check in with yourself</Text>

        <View style={styles.moodSection}>
          <MoodSelector selectedMood={selectedMood} onSelect={setSelectedMood} />
        </View>

        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>Add a note (optional)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="What's on your mind..."
            placeholderTextColor={colors.textTertiary}
            multiline
            value={note}
            onChangeText={setNote}
            maxLength={500}
          />
          <Text style={styles.charCount}>{note.length}/500</Text>
        </View>

        {saved ? (
          <Animated.View style={[styles.successContainer, checkStyle]}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.successText}>Mood logged</Text>
          </Animated.View>
        ) : (
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              {
                opacity: pressed ? 0.85 : selectedMood ? 1 : 0.5,
                backgroundColor: selectedMood ? colors.primary : colors.textTertiary,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Log Mood</Text>
          </Pressable>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 28,
  },
  moodSection: {
    marginBottom: 28,
  },
  noteSection: {
    marginBottom: 28,
  },
  noteLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 10,
  },
  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: 6,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  successContainer: {
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.success,
  },
});
