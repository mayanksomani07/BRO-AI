import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUserStore } from '../../store/userStore';
import { COLORS, RADIUS } from '../../constants/theme';

type SocialHabit = 'none' | 'light' | 'moderate' | 'heavy';
type SleepTime = 'early' | 'normal' | 'late' | 'very_late';

export default function BaselineSetupScreen() {
  const navigation = useNavigation<any>();
  const { setName, setSocialMediaHabit, completeOnboarding } = useUserStore();
  const [name, setNameLocal] = useState('');
  const [socialHabit, setSocial] = useState<SocialHabit>('light');
  const [sleepTime, setSleep] = useState<SleepTime>('normal');
  const [step, setStep] = useState(0);

  const handleFinish = async () => {
    setName(name.trim() || 'Bhai');
    setSocialMediaHabit(socialHabit);
    await completeOnboarding();
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#080B14', '#0A0F20']} style={StyleSheet.absoluteFillObject} />

      {/* Progress */}
      <View style={styles.progressBar}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.progressDot, step >= i && styles.progressDotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <BaselineStep
            emoji="👋"
            title="What should I call you?"
            sub="Just your first name or nickname is fine."
          >
            {/* Real TextInput so keyboard works */}
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setNameLocal}
              placeholder="Type your name..."
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              returnKeyType="done"
              maxLength={20}
            />
            <Text style={styles.orText}>— or pick one —</Text>
            <View style={styles.nameSuggestions}>
              {['Bhai', 'Yaar', 'Dost', 'Buddy'].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.nameChip, name === n && styles.nameChipActive]}
                  onPress={() => setNameLocal(n)}
                >
                  <Text style={[styles.nameChipText, name === n && styles.nameChipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </BaselineStep>
        )}

        {step === 1 && (
          <BaselineStep
            emoji="📱"
            title="Social media usage?"
            sub="Be honest — this helps calibrate your baseline."
          >
            {([
              { k: 'none', label: 'Barely use it', emoji: '🌿' },
              { k: 'light', label: 'Casual scrolling', emoji: '😊' },
              { k: 'moderate', label: 'Few hours daily', emoji: '📱' },
              { k: 'heavy', label: 'Always on it', emoji: '😬' },
            ] as const).map(option => (
              <TouchableOpacity
                key={option.k}
                style={[styles.option, socialHabit === option.k && styles.optionActive]}
                onPress={() => setSocial(option.k)}
                activeOpacity={0.75}
              >
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                <Text style={[styles.optionLabel, socialHabit === option.k && styles.optionLabelActive]}>
                  {option.label}
                </Text>
                {socialHabit === option.k && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </BaselineStep>
        )}

        {step === 2 && (
          <BaselineStep
            emoji="🌙"
            title="When do you usually sleep?"
            sub="This sets your circadian baseline."
          >
            {([
              { k: 'early', label: 'Before 10 PM', emoji: '🌞' },
              { k: 'normal', label: '10 PM – 12 AM', emoji: '😴' },
              { k: 'late', label: '12 AM – 2 AM', emoji: '🌙' },
              { k: 'very_late', label: 'After 2 AM', emoji: '🦉' },
            ] as const).map(option => (
              <TouchableOpacity
                key={option.k}
                style={[styles.option, sleepTime === option.k && styles.optionActive]}
                onPress={() => setSleep(option.k)}
                activeOpacity={0.75}
              >
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                <Text style={[styles.optionLabel, sleepTime === option.k && styles.optionLabelActive]}>
                  {option.label}
                </Text>
                {sleepTime === option.k && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </BaselineStep>
        )}

        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => step < 2 ? setStep(s => s + 1) : handleFinish()}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.ctaGradient}>
            <Text style={styles.ctaText}>
              {step < 2 ? 'Next →' : "Let's go! 🚀"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function BaselineStep({ emoji, title, sub, children }: {
  emoji: string; title: string; sub: string; children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{sub}</Text>
      <View style={styles.stepContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  progressBar: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingTop: 60, paddingBottom: 10,
  },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  progressDotActive: { backgroundColor: COLORS.primary },
  content: { paddingHorizontal: 24, paddingTop: 24 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 8 },
  sub: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21, marginBottom: 24 },
  stepContent: { gap: 10, marginBottom: 28 },

  nameInput: {
    borderWidth: 1.5, borderColor: COLORS.borderFocus,
    borderRadius: RADIUS.xl, padding: 18,
    backgroundColor: COLORS.card,
    fontSize: 18, color: COLORS.textPrimary, fontWeight: '600',
  },
  orText: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginVertical: 8 },
  nameSuggestions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  nameChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  nameChipActive: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary },
  nameChipText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  nameChipTextActive: { color: COLORS.primary },

  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  optionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  optionEmoji: { fontSize: 22 },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  optionLabelActive: { color: COLORS.primary },

  ctaBtn: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 14 },
  ctaGradient: { paddingVertical: 18, alignItems: 'center' },
  ctaText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  backBtn: { alignItems: 'center', paddingVertical: 8 },
  backText: { fontSize: 14, color: COLORS.textMuted },
});
