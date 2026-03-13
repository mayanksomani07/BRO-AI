/**
 * DailyCheckIn — 5-question quick check-in that feeds ALL mood signals.
 * Replaces "default neutral" data with real user-reported values.
 *
 * Drives these signals:
 *   - keystroke (energy + anxiety proxy)
 *   - appUsage  (sleep quality proxy)
 *   - socialWithdrawal (social contact proxy)
 *   - circadian (sleep time reported)
 *   - journalSentiment (general mood self-report)
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS } from '../constants/theme';
import { useTranslation } from 'react-i18next';
import { saveCheckIn } from '../engine/SignalCollector';

interface Question {
  id: string;
  signal: string;    // which signal this feeds
  emoji: string;
  question: string;
  low: string;
  high: string;
  lowEmoji: string;
  highEmoji: string;
  inverted?: boolean;  // if true, high answer = bad signal
}

const QUESTIONS: Question[] = [
  {
    id: 'energy',
    signal: 'keystroke',
    emoji: '⚡',
    question: 'Aaj kitni energy hai?',
    low: 'Bilkul nahi', high: 'Bahut zyada',
    lowEmoji: '😴', highEmoji: '🚀',
  },
  {
    id: 'sleep',
    signal: 'appUsage',
    emoji: '😴',
    question: 'Raat ko neend kaisi rahi?',
    low: 'Bahut buri', high: 'Bahut achi',
    lowEmoji: '😩', highEmoji: '😌',
  },
  {
    id: 'anxiety',
    signal: 'keystroke',
    emoji: '😰',
    question: 'Kuch anxiety ya tension feel ho rahi hai?',
    low: 'Bilkul nahi', high: 'Bahut zyada',
    lowEmoji: '😌', highEmoji: '😤',
    inverted: true,
  },
  {
    id: 'social',
    signal: 'socialWithdrawal',
    emoji: '👥',
    question: 'Aaj kisi se baat ki ya mila?',
    low: 'Kisi se nahi', high: 'Kaafi logon se',
    lowEmoji: '🧍', highEmoji: '🤝',
  },
  {
    id: 'mood',
    signal: 'journalSentiment',
    emoji: '💙',
    question: 'Overall, aaj ka mood kaisa tha?',
    low: 'Bahut kharab', high: 'Bahut acha',
    lowEmoji: '😔', highEmoji: '😄',
  },
];

interface Props {
  visible: boolean;
  onComplete: (signals: {
    energy: number; sleep: number; anxiety: number; social: number; mood: number;
  }) => void;
  onDismiss: () => void;
  language?: string;
}

export default function DailyCheckIn({ visible, onComplete, onDismiss, language = 'hinglish' }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [fadeAnim] = useState(new Animated.Value(1));

  const q = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;

  const selectValue = async (val: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate transition
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const updated = { ...answers, [q.id]: val };
    setAnswers(updated);

    if (step < totalSteps - 1) {
      setTimeout(() => setStep(s => s + 1), 150);
    } else {
      // Done — save and call onComplete
      const result = {
        energy: updated.energy ?? 3,
        sleep: updated.sleep ?? 3,
        anxiety: updated.anxiety ?? 3,
        social: updated.social ?? 3,
        mood: updated.mood ?? 3,
      };

      saveCheckIn({
        energy: result.energy,
        socialness: result.social,
        anxiety: result.anxiety,
        sleep: result.sleep,
      });

      setTimeout(() => {
        setStep(0);
        setAnswers({});
        onComplete(result);
      }, 300);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <LinearGradient colors={['#0D1B3E', '#080B14']} style={styles.sheetGrad}>

            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>
                  {t('checkin.title')}
                </Text>
                <Text style={styles.headerSub}>
                  {t('checkin.sub')}
                </Text>
              </View>
              <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Progress dots */}
            <View style={styles.progress}>
              {QUESTIONS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i < step && styles.progressDotDone,
                    i === step && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>

            {/* Question */}
            <Animated.View style={[styles.questionBlock, { opacity: fadeAnim }]}>
              <Text style={styles.qEmoji}>{q.emoji}</Text>
              <Text style={styles.qText}>{q.question}</Text>
              <Text style={styles.qSignalLabel}>
                {`${t('checkin.measures')}${q.signal.replace(/([A-Z])/g, ' $1')}`}
              </Text>
            </Animated.View>

            {/* 5-point scale */}
            <Animated.View style={[styles.scale, { opacity: fadeAnim }]}>
              <View style={styles.scaleRow}>
                {[1, 2, 3, 4, 5].map(val => {
                  const selected = answers[q.id] === val;
                  const isLow = val <= 2;
                  const isHigh = val >= 4;
                  const color = selected
                    ? (q.inverted ? (isLow ? COLORS.success : COLORS.danger) : (isHigh ? COLORS.success : isLow ? COLORS.danger : COLORS.warning))
                    : COLORS.border;
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[styles.scaleBtn, { borderColor: color, backgroundColor: selected ? color + '30' : COLORS.surface }]}
                      onPress={() => selectValue(val)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.scaleBtnNum, { color: selected ? color : COLORS.textMuted }]}>
                        {val}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.scaleLabels}>
                <Text style={styles.scaleLabelText}>{q.lowEmoji} {q.low}</Text>
                <Text style={styles.scaleLabelText}>{q.high} {q.highEmoji}</Text>
              </View>
            </Animated.View>

            {/* Step counter */}
            <Text style={styles.stepCounter}>
              {step + 1} / {totalSteps}
            </Text>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  sheetGrad: { padding: 28, paddingBottom: 48 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
  },

  progress: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  progressDot: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
  },
  progressDotActive: { backgroundColor: COLORS.primary },
  progressDotDone: { backgroundColor: COLORS.primary + '60' },

  questionBlock: { alignItems: 'center', marginBottom: 32 },
  qEmoji: { fontSize: 44, marginBottom: 14 },
  qText: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', lineHeight: 28, marginBottom: 8 },
  qSignalLabel: { fontSize: 11, color: COLORS.primary + '80', fontWeight: '600', letterSpacing: 0.5 },

  scale: { marginBottom: 16 },
  scaleRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 12 },
  scaleBtn: {
    width: 52, height: 52, borderRadius: 14, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  scaleBtnNum: { fontSize: 20, fontWeight: '800' },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  scaleLabelText: { fontSize: 11, color: COLORS.textMuted },

  stepCounter: { textAlign: 'center', fontSize: 13, color: COLORS.textMuted },
});
