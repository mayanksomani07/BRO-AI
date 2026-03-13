/**
 * MoodDebugPanel — live signal inspector
 *
 * Shows exactly WHY the mood score is what it is.
 * Each signal card shows: current value, data source, weight, contribution, confidence.
 * Expandable: tap to see raw metrics.
 *
 * Also shows the SIMULATION mode so you can test different scenarios
 * in Expo Go without a native build.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { useTranslation } from 'react-i18next';
import { AllSignals } from '../engine/MoodEngine';
import { SIGNAL_WEIGHTS } from '../engine/BiomarkerEngine';

type IonName = keyof typeof Ionicons.glyphMap;

interface SignalMeta {
  key: keyof AllSignals;
  newKey: 'typing' | 'sleep' | 'circadian' | 'social' | 'journal';
  labelKey: string;
  label: string;
  icon: IonName;
  color: string;
  weight: number;
  whatItMeasures: string;
  howWeGetIt: string;
  lowMeans: string;
  highMeans: string;
  expoGo: boolean; // available without native build
  nativeOnly?: string; // what extra we get with native
}

const SIGNALS: SignalMeta[] = [
  {
    key: 'keystroke',
    newKey: 'typing',
    labelKey: 'signals.keystroke_label',
    label: 'Typing Dynamics',
    icon: 'keypad-outline',
    color: '#60A5FA',
    weight: SIGNAL_WEIGHTS.typing,
    whatItMeasures: 'Your energy level, anxiety, and mental focus — inferred from HOW you type, not WHAT you type.',
    howWeGetIt: 'Chat & journal TextInput: measures chars/sec, backspace rate, pause frequency, irregularity in inter-key timing.',
    lowMeans: 'Slow typing + high backspace rate + long pauses = low energy, anxious, or ruminating',
    highMeans: 'Steady, fast typing with few corrections = focused, energetic, mentally clear',
    expoGo: true,
    nativeOnly: 'iOS Keyboard Extension: cross-app typing (WhatsApp, Instagram, Notes, etc.)',
  },
  {
    key: 'appUsage',
    newKey: 'sleep',
    labelKey: 'signals.appUsage_label',
    label: 'Sleep Quality',
    icon: 'moon-outline',
    color: '#A78BFA',
    weight: SIGNAL_WEIGHTS.sleep,
    whatItMeasures: 'Sleep quality directly controls serotonin production and emotional regulation.',
    howWeGetIt: 'Daily check-in question: "Raat ko neend kaisi rahi?" (1=terrible → 5=great).',
    lowMeans: 'Terrible sleep = low energy, irritable, emotional dysregulation = lower mood score',
    highMeans: 'Great sleep = restored serotonin + dopamine = higher baseline mood',
    expoGo: true,
    nativeOnly: 'HealthKit: actual sleep stage data (REM, deep, awake) with timestamps',
  },
  {
    key: 'circadian',
    newKey: 'circadian',
    labelKey: 'signals.circadian_label',
    label: 'Circadian Rhythm',
    icon: 'time-outline',
    color: '#34D399',
    weight: SIGNAL_WEIGHTS.circadian,
    whatItMeasures: 'Deviation from your normal sleep-wake cycle. Late-night activity shifts your biological clock.',
    howWeGetIt: 'Compares your app open timestamps against the baseline sleep time you set in onboarding.',
    lowMeans: 'Opening app at 3 AM when you normally sleep at 11 PM = 3-4 point deduction',
    highMeans: 'App opens align with your normal waking hours = circadian rhythm stable',
    expoGo: true,
    nativeOnly: 'Screen Time API: exact app-by-app usage pattern including cross-app session timing',
  },
  {
    key: 'socialWithdrawal',
    newKey: 'social',
    labelKey: 'signals.socialWithdrawal_label',
    label: 'Social Connection',
    icon: 'people-outline',
    color: '#F59E0B',
    weight: SIGNAL_WEIGHTS.social,
    whatItMeasures: 'Social withdrawal is a primary symptom of depression (DSM-5 criterion). Isolation compounds low mood.',
    howWeGetIt: 'Daily check-in question about social contact. Future: keyboard extension tracks WhatsApp/Instagram session frequency.',
    lowMeans: 'Kisi se baat nahi ki = severe withdrawal = 1-3 points off',
    highMeans: 'Talked to / met several people = active social network = good mood buffer',
    expoGo: true,
    nativeOnly: 'Keyboard extension: messaging session count in WhatsApp, iMessage, Instagram DMs',
  },
  {
    key: 'journalSentiment',
    newKey: 'journal',
    labelKey: 'signals.journalSentiment_label',
    label: 'Journal / Chat Sentiment',
    icon: 'document-text-outline',
    color: '#F472B6',
    weight: SIGNAL_WEIGHTS.journal,
    whatItMeasures: 'The actual emotional content of what you write — not just how you write it.',
    howWeGetIt: 'Gemini NLP analyzes journal entries and chat messages for sentiment, detected themes, and urgency flags.',
    lowMeans: 'Writing about breakup, failure, loneliness, grief → low sentiment score',
    highMeans: 'Writing about gratitude, hope, excitement, social events → high sentiment score',
    expoGo: true,
    nativeOnly: 'Browser search intent: detect emotionally loaded searches like "how to forget someone"',
  },
];

interface Props {
  signals: AllSignals | null;
  moodScore: number;
  language?: string;
}

export default function MoodDebugPanel({ signals, moodScore, language = 'hinglish' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);
  const { t } = useTranslation();

  if (!expanded) {
    return (
      <TouchableOpacity style={s.collapsedRow} onPress={() => setExpanded(true)} activeOpacity={0.8}>
        <View style={s.collapsedLeft}>
          <Ionicons name="analytics-outline" size={15} color={COLORS.primary} />
          <Text style={s.collapsedTxt}>
            {t('components.signal_breakdown')}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  }

  const vals = signals ?? {
    keystroke: 5, appUsage: 5, circadian: 5, socialWithdrawal: 5, journalSentiment: 5
  };

  const getVal = (sig: SignalMeta): number => {
    const v = vals[sig.key];
    return typeof v === 'number' ? v : 5;
  };

  const contributions = SIGNALS.map(sig => ({
    ...sig,
    value: getVal(sig),
    contribution: getVal(sig) * sig.weight,
  }));

  const total = contributions.reduce((s, c) => s + c.contribution, 0);

  const getConfidenceLabel = (sig: SignalMeta): { label: string; color: string } => {
    const v = getVal(sig);
    if (v === 5.0) return { label: t('components.no_data'), color: COLORS.textMuted };
    return { label: t('components.live'), color: COLORS.success };
  };

  return (
    <View style={s.panel}>
      <LinearGradient colors={['#0D1428', '#0A0F1E']} style={s.panelGrad}>

        {/* Header */}
        <TouchableOpacity style={s.panelHeader} onPress={() => setExpanded(false)} activeOpacity={0.8}>
          <View style={s.panelHeaderLeft}>
            <Ionicons name="analytics" size={17} color={COLORS.primary} />
            <Text style={s.panelTitle}>
              {t('components.mood_algo')}
            </Text>
          </View>
          <Ionicons name="chevron-up" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Formula visual */}
        <View style={s.formulaBox}>
          <Text style={s.formulaLabel}>
            {t('components.formula')}
          </Text>
          <Text style={s.formulaText}>
            mood_score = typing×0.25 + sleep×0.20 + circadian×0.20 + social×0.20 + journal×0.15
          </Text>
          <View style={s.formulaResult}>
            <Text style={s.formulaResultLabel}>{t('components.raw_total')}</Text>
            <Text style={s.formulaResultVal}>{total.toFixed(2)}</Text>
            <Text style={s.formulaResultLabel}>{t('components.smoothed')}</Text>
            <Text style={[s.formulaResultVal, { color: '#60A5FA' }]}>{moodScore.toFixed(1)}</Text>
          </View>
          <Text style={s.smoothingNote}>
            {t('components.smoothing_note')}
          </Text>
        </View>

        {/* Signal cards */}
        {contributions.map(sig => {
          const conf     = getConfidenceLabel(sig);
          const isExpSig = expandedSignal === sig.key;
          const barWidth = `${(sig.value / 10) * 100}%` as any;
          const barColor = sig.value < 3.5 ? COLORS.danger : sig.value < 5.5 ? COLORS.warning : sig.value < 7.5 ? COLORS.success : COLORS.primary;

          return (
            <TouchableOpacity
              key={sig.key}
              style={s.sigCard}
              onPress={() => setExpandedSignal(isExpSig ? null : sig.key)}
              activeOpacity={0.85}
            >
              {/* Signal row */}
              <View style={s.sigRow}>
                <View style={[s.sigIcon, { backgroundColor: sig.color + '20' }]}>
                  <Ionicons name={sig.icon} size={15} color={sig.color} />
                </View>
                <View style={s.sigBody}>
                  <View style={s.sigTitleRow}>
                    <Text style={s.sigLabel}>{t(sig.labelKey)}</Text>
                    <View style={[s.confBadge, { backgroundColor: conf.color + '20' }]}>
                      <Text style={[s.confTxt, { color: conf.color }]}>{conf.label}</Text>
                    </View>
                  </View>
                  {/* Bar */}
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: barWidth, backgroundColor: barColor }]} />
                  </View>
                  <View style={s.sigMetaRow}>
                    <Text style={s.sigVal}>{sig.value.toFixed(1)}/10</Text>
                    <Text style={s.sigWeight}>×{sig.weight}</Text>
                    <Text style={[s.sigContrib, { color: sig.color }]}>
                      = {sig.contribution.toFixed(2)} pts
                    </Text>
                  </View>
                </View>
                <Ionicons name={isExpSig ? 'chevron-up' : 'chevron-down'} size={13} color={COLORS.textMuted} />
              </View>

              {/* Expanded detail */}
              {isExpSig && (
                <View style={s.sigDetail}>
                  <DetailRow label={t('components.measures')} value={sig.whatItMeasures} />
                  <DetailRow label={t('components.data_source')} value={sig.howWeGetIt} color="#60A5FA" />
                  <DetailRow label={t('components.low_means')} value={sig.lowMeans} color={COLORS.danger} />
                  <DetailRow label={t('components.high_means')} value={sig.highMeans} color={COLORS.success} />
                  {sig.nativeOnly && (
                    <View style={s.nativeNote}>
                      <Ionicons name="build-outline" size={11} color={COLORS.warning} />
                      <Text style={s.nativeNoteTxt}>
                        {t('components.native_adds')}{sig.nativeOnly}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Why does it show 8.4 explanation */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={15} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={s.infoTitle}>
              {t('components.why_8_4')}
            </Text>
            <Text style={s.infoBody}>
              {t('components.why_8_4_body')}
            </Text>
          </View>
        </View>

        {/* Expo Go vs Native */}
        <View style={s.capabilityBox}>
          <Text style={s.capabilityTitle}>
            {t('components.expo_vs_native')}
          </Text>
          {[
            { label: 'In-app typing (chat/journal)', works: true },
            { label: 'Circadian from app open time', works: true },
            { label: 'Daily check-in self-report', works: true },
            { label: 'Gemini NLP sentiment', works: true },
            { label: 'iOS Keyboard Extension (cross-app)', works: false },
            { label: 'HealthKit sleep stages', works: false },
            { label: 'Screen Time API', works: false },
            { label: 'Browser search intent', works: false },
          ].map((item, i) => (
            <View key={i} style={s.capRow}>
              <Ionicons
                name={item.works ? 'checkmark-circle' : 'ellipse-outline'}
                size={13}
                color={item.works ? COLORS.success : COLORS.textMuted}
              />
              <Text style={[s.capTxt, !item.works && { color: COLORS.textMuted }]}>
                {item.label}
              </Text>
              {!item.works && (
                <View style={s.nativePill}>
                  <Text style={s.nativePillTxt}>EAS build</Text>
                </View>
              )}
            </View>
          ))}
        </View>

      </LinearGradient>
    </View>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailVal, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  // Collapsed row
  collapsedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  collapsedLeft:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  collapsedTxt: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  // Panel
  panel: { marginBottom: 14, borderRadius: RADIUS.xl, overflow: 'hidden' },
  panelGrad: { borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  panelHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },

  // Formula
  formulaBox: { backgroundColor: COLORS.primary + '10', borderRadius: RADIUS.lg, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: COLORS.primary + '20' },
  formulaLabel: { fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 1.5, marginBottom: 4 },
  formulaText: { fontSize: 10, color: COLORS.textSecondary, fontFamily: 'monospace', lineHeight: 15 },
  formulaResult: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  formulaResultLabel: { fontSize: 11, color: COLORS.textMuted },
  formulaResultVal: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  smoothingNote: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, lineHeight: 14 },

  // Signal card
  sigCard: { backgroundColor: COLORS.surface + '80', borderRadius: RADIUS.lg, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  sigRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sigIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sigBody: { flex: 1 },
  sigTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sigLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  confBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  confTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  barTrack: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: '100%', borderRadius: 2 },
  sigMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sigVal: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  sigWeight: { fontSize: 10, color: COLORS.textMuted },
  sigContrib: { fontSize: 11, fontWeight: '700' },

  // Signal expanded detail
  sigDetail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 6 },
  detailRow: { gap: 2 },
  detailLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  detailVal: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 15 },
  nativeNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 4, backgroundColor: COLORS.warning + '10', padding: 7, borderRadius: RADIUS.sm },
  nativeNoteTxt: { fontSize: 10, color: COLORS.warning, flex: 1, lineHeight: 14 },

  // Info box
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: COLORS.primary + '10', borderRadius: RADIUS.lg, padding: 12, marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.primary + '20' },
  infoTitle: { fontSize: 11, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  infoBody: { fontSize: 10, color: COLORS.textSecondary, lineHeight: 15 },

  // Capability table
  capabilityBox: { backgroundColor: COLORS.surface + '60', borderRadius: RADIUS.lg, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  capabilityTitle: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  capRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  capTxt: { fontSize: 11, color: COLORS.textPrimary, flex: 1 },
  nativePill: { backgroundColor: COLORS.warning + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  nativePillTxt: { fontSize: 8, fontWeight: '700', color: COLORS.warning, letterSpacing: 0.5 },
});
