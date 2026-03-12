/**
 * MoodSignalBreakdown — shows all 5 live signals so you can verify
 * the algorithm is working. Tapping each signal explains what it measures.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { AllSignals } from '../engine/MoodEngine';

interface SignalConfig {
  key: keyof AllSignals;
  label: string;
  labelHi: string;
  icon: string;
  color: string;
  description: string;
  descriptionHi: string;
  weight: number;
  dataSource: string;
}

const SIGNAL_CONFIG: SignalConfig[] = [
  {
    key: 'keystroke',
    label: 'Typing Dynamics', labelHi: 'Typing Pattern',
    icon: 'keypad-outline', color: '#60A5FA', weight: 0.25,
    description: 'Measures your typing speed, backspace rate, and hesitation patterns in the chat/journal. Slow typing + high backspace = low mood signal.',
    descriptionHi: 'Chat/journal mein typing speed, backspace rate aur ruk-ruk ke likhna measure karta hai.',
    dataSource: 'In-app chat & journal typing',
  },
  {
    key: 'appUsage',
    label: 'Sleep Quality', labelHi: 'Neend Quality',
    icon: 'moon-outline', color: '#A78BFA', weight: 0.20,
    description: 'Tracks sleep quality from your check-in. Poor sleep → depressed circadian rhythm → lower mood score.',
    descriptionHi: 'Check-in se neend quality track karta hai. Kharab neend = lower mood score.',
    dataSource: 'Daily check-in (sleep question)',
  },
  {
    key: 'circadian',
    label: 'Circadian Rhythm', labelHi: 'Circadian Rhythm',
    icon: 'time-outline', color: '#34D399', weight: 0.20,
    description: 'Compares your app usage time vs your stated baseline sleep time. Opening app at 3 AM when you normally sleep at 11 PM = 3-point deduction.',
    descriptionHi: 'App use karne ka time vs tumhara baseline sleep time compare karta hai.',
    dataSource: 'App open timestamps vs onboarding baseline',
  },
  {
    key: 'socialWithdrawal',
    label: 'Social Contact', labelHi: 'Social Contact',
    icon: 'people-outline', color: '#F59E0B', weight: 0.20,
    description: 'Measures social engagement from your check-in. Not talking to anyone = withdrawal signal = lower score.',
    descriptionHi: 'Check-in se social engagement measure karta hai. Kisi se baat nahi = withdrawal signal.',
    dataSource: 'Daily check-in (social question)',
  },
  {
    key: 'journalSentiment',
    label: 'Journal / Chat', labelHi: 'Journal / Chat',
    icon: 'chatbubble-outline', color: '#F472B6', weight: 0.15,
    description: 'Gemini AI analyzes emotional sentiment from your journal entries and chat messages. Most accurate signal when you write or chat.',
    descriptionHi: 'Gemini AI journal aur chat se emotional sentiment analyze karta hai.',
    dataSource: 'Journal entries + Bro_AI chat',
  },
];

interface Props {
  signals: AllSignals | null;
  language?: string;
  checkInDone: boolean;
  onCheckIn: () => void;
}

export default function MoodSignalBreakdown({ signals, language = 'hinglish', checkInDone, onCheckIn }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<SignalConfig | null>(null);

  if (!signals) return null;

  const isEnglish = language === 'english';

  const getSignalColor = (score: number) => {
    if (score >= 7.5) return COLORS.success;
    if (score >= 5.0) return COLORS.warning;
    if (score >= 3.0) return '#F97316';
    return COLORS.danger;
  };

  const getSignalEmoji = (score: number) => {
    if (score >= 7.5) return '✅';
    if (score >= 5.0) return '🟡';
    if (score >= 3.0) return '🟠';
    return '🔴';
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A1228', '#080B14']} style={styles.gradient}>

        {/* Header */}
        <TouchableOpacity
          style={styles.headerRow}
          onPress={() => setExpanded(e => !e)}
          activeOpacity={0.8}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.title}>
              {isEnglish ? '🧠 Mood Algorithm' : '🧠 Mood Algorithm'}
            </Text>
            <Text style={styles.subtitle}>
              {isEnglish ? 'Tap to see what drives your score' : 'Score kaise bana — yahan dekho'}
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20} color={COLORS.textMuted}
          />
        </TouchableOpacity>

        {/* Check-in prompt if not done */}
        {!checkInDone && (
          <TouchableOpacity style={styles.checkInBanner} onPress={onCheckIn} activeOpacity={0.85}>
            <LinearGradient
              colors={[COLORS.primary + '30', COLORS.primary + '15']}
              style={styles.checkInGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.checkInEmoji}>⚠️</Text>
              <View style={styles.checkInInfo}>
                <Text style={styles.checkInTitle}>
                  {isEnglish ? 'Score is using defaults' : 'Score abhi default values use kar raha hai'}
                </Text>
                <Text style={styles.checkInSub}>
                  {isEnglish ? 'Tap to do 30-sec check-in → real score' : 'Check-in karo → accurate score milega'}
                </Text>
              </View>
              <View style={styles.checkInBtn}>
                <Text style={styles.checkInBtnText}>{isEnglish ? 'Start' : 'Shuru Karo'}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Signal bars (always visible even when collapsed) */}
        <View style={styles.signalBars}>
          {SIGNAL_CONFIG.map(cfg => {
            const score = signals[cfg.key];
            const color = getSignalColor(score);
            const barWidth = `${(score / 10) * 100}%`;
            return (
              <TouchableOpacity
                key={cfg.key}
                style={styles.signalRow}
                onPress={() => {
                  setSelectedSignal(selectedSignal?.key === cfg.key ? null : cfg);
                  setExpanded(true);
                }}
                activeOpacity={0.75}
              >
                <View style={styles.signalLeft}>
                  <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                  <Text style={styles.signalLabel} numberOfLines={1}>
                    {isEnglish ? cfg.label : cfg.labelHi}
                  </Text>
                  <Text style={styles.signalWeight}>×{cfg.weight}</Text>
                </View>
                <View style={styles.signalBarTrack}>
                  <View style={[styles.signalBarFill, { width: barWidth as any, backgroundColor: color }]} />
                </View>
                <Text style={[styles.signalScore, { color }]}>
                  {getSignalEmoji(score)} {score.toFixed(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Detail panel when a signal is tapped */}
        {selectedSignal && expanded && (
          <View style={styles.detailPanel}>
            <LinearGradient
              colors={[selectedSignal.color + '20', selectedSignal.color + '05']}
              style={styles.detailGrad}
            >
              <Text style={styles.detailTitle}>
                {isEnglish ? selectedSignal.label : selectedSignal.labelHi}
              </Text>
              <Text style={styles.detailDesc}>
                {isEnglish ? selectedSignal.description : selectedSignal.descriptionHi}
              </Text>
              <View style={styles.detailSource}>
                <Ionicons name="information-circle-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.detailSourceText}>{selectedSignal.dataSource}</Text>
              </View>
              <Text style={styles.detailScore}>
                {isEnglish ? 'Current value' : 'Current value'}: {signals[selectedSignal.key].toFixed(1)}/10
                {' '}(weight: {(selectedSignal.weight * 100).toFixed(0)}%)
                {' '}→ contributes {(signals[selectedSignal.key] * selectedSignal.weight).toFixed(2)} to final score
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Formula */}
        {expanded && (
          <View style={styles.formula}>
            <Text style={styles.formulaTitle}>
              {isEnglish ? 'Score Formula' : 'Score Formula'}
            </Text>
            <Text style={styles.formulaText}>
              ({signals.keystroke.toFixed(1)}×0.25) + ({signals.appUsage.toFixed(1)}×0.20) + ({signals.circadian.toFixed(1)}×0.20) + ({signals.socialWithdrawal.toFixed(1)}×0.20) + ({signals.journalSentiment.toFixed(1)}×0.15)
            </Text>
            <Text style={styles.formulaResult}>
              = {(
                signals.keystroke * 0.25 +
                signals.appUsage * 0.20 +
                signals.circadian * 0.20 +
                signals.socialWithdrawal * 0.20 +
                signals.journalSentiment * 0.15
              ).toFixed(2)} (before smoothing)
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, borderRadius: RADIUS.xl, overflow: 'hidden' },
  gradient: { padding: 18, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: {},
  title: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  checkInBanner: { marginBottom: 14, borderRadius: RADIUS.lg, overflow: 'hidden' },
  checkInGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  checkInEmoji: { fontSize: 20 },
  checkInInfo: { flex: 1 },
  checkInTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  checkInSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  checkInBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  checkInBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  signalBars: { gap: 10, marginBottom: 4 },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signalLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, width: 130 },
  signalLabel: { fontSize: 11, color: COLORS.textSecondary, flex: 1 },
  signalWeight: { fontSize: 10, color: COLORS.textMuted },
  signalBarTrack: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  signalBarFill: { height: '100%', borderRadius: 3 },
  signalScore: { fontSize: 12, fontWeight: '700', width: 56, textAlign: 'right' },

  detailPanel: { marginTop: 12, borderRadius: RADIUS.lg, overflow: 'hidden' },
  detailGrad: { padding: 14, borderRadius: RADIUS.lg },
  detailTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  detailDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 8 },
  detailSource: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  detailSourceText: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
  detailScore: { fontSize: 12, color: COLORS.primary, fontWeight: '600', lineHeight: 18 },

  formula: {
    marginTop: 12, padding: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  formulaTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  formulaText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'monospace', lineHeight: 17 },
  formulaResult: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginTop: 6 },
});