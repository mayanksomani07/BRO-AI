import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';

// ─── Motivation Cards ─────────────────────────────────────────────────────────

const QUOTES: Record<string, string[]> = {
  hinglish: [
    'Ek buri raat poori zindagi nahi hoti. 💙',
    'Tu jitna soch raha hai utna bura nahi hai situation.',
    'Aaj ka dard kal ki strength hai, bhai.',
    'Ruk mat. Thak ja, par ruk mat.',
    'Tu is cheez se bada hai jo tujhe chhota feel kara rahi hai.',
    'Mushkilon mein bhi ek cheez dhundh — woh hoti hai.',
  ],
  english: [
    'One bad night is not your whole life. 💙',
    "Things are not as bad as they seem right now.",
    "Today's pain is tomorrow's strength, bro.",
    "Don't stop. Rest, but don't stop.",
    "You're bigger than what's making you feel small.",
    'Even in hard times, there is something.',
  ],
};

interface MotivationCardProps {
  language: string;
  moodScore: number;
}

export default function MotivationCard({ language, moodScore }: MotivationCardProps) {
  const quotes = QUOTES[language] ?? QUOTES['hinglish'];
  const [index, setIndex] = useState(Math.floor(Math.random() * quotes.length));
  const translateX = useRef(new Animated.Value(0)).current;

  const nextQuote = () => {
    Animated.sequence([
      Animated.timing(translateX, { toValue: -30, duration: 150, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    setIndex(i => (i + 1) % quotes.length);
  };

  return (
    <View style={styles.motCard}>
      <LinearGradient
        colors={['#0D1B3E', '#0A1228']}
        style={styles.motGradient}
      >
        <Text style={styles.motLabel}>
          {language === 'english' ? "TODAY'S THOUGHT" : 'AAJ KI BAAT'}
        </Text>
        <Animated.Text style={[styles.motQuote, { transform: [{ translateX }] }]}>
          "{quotes[index]}"
        </Animated.Text>
        <TouchableOpacity style={styles.motNext} onPress={nextQuote} activeOpacity={0.7}>
          <Ionicons name="refresh" size={14} color={COLORS.textMuted} />
          <Text style={styles.motNextText}>
            {language === 'english' ? 'Another one' : 'Ek aur'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

// ─── Task Card (quick view) ───────────────────────────────────────────────────

const QUICK_TASKS: Record<string, { text: string; xp: number; emoji: string }[]> = {
  hinglish: [
    { text: 'Ek glass paani pi abhi', xp: 10, emoji: '💧' },
    { text: '5 baar gehri saans le', xp: 15, emoji: '🌬️' },
    { text: '10 min walk — bina phone', xp: 30, emoji: '🚶' },
  ],
  english: [
    { text: 'Drink a glass of water now', xp: 10, emoji: '💧' },
    { text: 'Take 5 deep breaths', xp: 15, emoji: '🌬️' },
    { text: '10 min walk — no phone', xp: 30, emoji: '🚶' },
  ],
};

interface TaskCardProps {
  moodScore: number;
  language: string;
}

export function TaskCard({ moodScore, language }: TaskCardProps) {
  const tasks = QUICK_TASKS[language] ?? QUICK_TASKS['hinglish'];
  const task = moodScore < 4 ? tasks[0] : moodScore < 7 ? tasks[1] : tasks[2];
  const [done, setDone] = useState(false);

  return (
    <View style={styles.taskCard}>
      <LinearGradient colors={[COLORS.card, COLORS.surfaceElevated]} style={styles.taskGradient}>
        <Text style={styles.taskSectionLabel}>
          {language === 'english' ? "TODAY'S TASK" : 'AAJ KA TASK'}
        </Text>
        <View style={styles.taskRow}>
          <Text style={styles.taskEmoji}>{task.emoji}</Text>
          <Text style={styles.taskText}>{task.text}</Text>
        </View>
        <View style={styles.taskFooter}>
          <Text style={styles.taskXP}>+{task.xp} XP</Text>
          <TouchableOpacity
            style={[styles.doneBtn, done && styles.doneBtnActive]}
            onPress={() => setDone(true)}
            disabled={done}
            activeOpacity={0.8}
          >
            <Ionicons name={done ? 'checkmark' : 'flag'} size={14} color={done ? '#fff' : COLORS.primary} />
            <Text style={[styles.doneBtnText, done && { color: '#fff' }]}>
              {done
                ? (language === 'english' ? 'Done!' : 'Ho gaya!')
                : (language === 'english' ? 'Mark Done' : 'Done Karo')}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  motCard: { marginBottom: 16, borderRadius: RADIUS.xl, overflow: 'hidden' },
  motGradient: {
    padding: 20, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: 'rgba(61,126,255,0.2)',
  },
  motLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    color: COLORS.primary + '80', textTransform: 'uppercase', marginBottom: 12,
  },
  motQuote: {
    fontSize: 17, fontWeight: '600', color: COLORS.textPrimary,
    lineHeight: 26, fontStyle: 'italic',
  },
  motNext: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  motNextText: { fontSize: 12, color: COLORS.textMuted },

  taskCard: { marginBottom: 16, borderRadius: RADIUS.xl, overflow: 'hidden' },
  taskGradient: {
    padding: 18, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  taskSectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 12,
  },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  taskEmoji: { fontSize: 24 },
  taskText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskXP: { fontSize: 13, fontWeight: '700', color: COLORS.warning },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.primary,
  },
  doneBtnActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  doneBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});
