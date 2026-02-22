import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLanguage, LANGUAGES, type Language } from '@/lib/language-context';
import { router } from 'expo-router';
import colors from '@/constants/colors';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setLanguage, completeOnboarding } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<Language>('hinglish');
  const [step, setStep] = useState(0);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const handleContinue = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (step === 0) {
      setStep(1);
    } else {
      await setLanguage(selectedLang);
      await completeOnboarding();
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, paddingBottom: insets.bottom + webBottomInset }]}>
      {step === 0 ? (
        <ScrollView contentContainerStyle={styles.welcomeContent} showsVerticalScrollIndicator={false}>
          <View style={styles.iconContainer}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.iconGradient}>
              <Ionicons name="shield-checkmark" size={48} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={styles.welcomeTitle}>Welcome to MoodGuard</Text>
          <Text style={styles.welcomeSubtitle}>Your emotional wellness companion</Text>

          <View style={styles.privacyCard}>
            <View style={styles.privacyHeader}>
              <Ionicons name="lock-closed" size={20} color={colors.primary} />
              <Text style={styles.privacyTitle}>Your Privacy Matters</Text>
            </View>

            <View style={styles.privacyItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.privacyText}>All your data stays on your device</Text>
            </View>
            <View style={styles.privacyItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.privacyText}>We only analyze what you share in-app</Text>
            </View>
            <View style={styles.privacyItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.privacyText}>No access to your browser, apps, or contacts</Text>
            </View>
            <View style={styles.privacyItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.privacyText}>BroAI chats are private and not stored on servers</Text>
            </View>
            <View style={styles.privacyItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.privacyText}>You can delete all data anytime</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureItem}>
              <Ionicons name="analytics" size={24} color={colors.primary} />
              <Text style={styles.featureText}>Mood Tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="chatbubbles" size={24} color={colors.accent} />
              <Text style={styles.featureText}>BroAI Chat</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="musical-notes" size={24} color="#8B5CF6" />
              <Text style={styles.featureText}>Relaxing Music</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.langContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.langTitle}>Choose Your Language</Text>
          <Text style={styles.langSubtitle}>BroAI and messages will use this language</Text>

          <View style={styles.langGrid}>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang.id}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedLang(lang.id);
                }}
                style={[
                  styles.langOption,
                  selectedLang === lang.id && styles.langOptionSelected,
                ]}
              >
                <Text style={[styles.langNative, selectedLang === lang.id && styles.langNativeSelected]}>
                  {lang.nativeLabel}
                </Text>
                <Text style={[styles.langLabel, selectedLang === lang.id && styles.langLabelSelected]}>
                  {lang.label}
                </Text>
                {selectedLang === lang.id && (
                  <View style={styles.langCheck}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      <Pressable
        onPress={handleContinue}
        style={({ pressed }) => [styles.continueBtn, { opacity: pressed ? 0.85 : 1 }]}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueBtnGradient}
        >
          <Text style={styles.continueBtnText}>
            {step === 0 ? 'I Agree & Continue' : 'Start Using MoodGuard'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  welcomeContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 100,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  privacyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    gap: 14,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  privacyTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  privacyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    flex: 1,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  featureItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  langContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 100,
  },
  langTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    textAlign: 'center',
  },
  langSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  langGrid: {
    gap: 12,
  },
  langOption: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  langNative: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    minWidth: 80,
  },
  langNativeSelected: {
    color: colors.primary,
  },
  langLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    flex: 1,
  },
  langLabelSelected: {
    color: colors.primary,
  },
  langCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  continueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
  },
  continueBtnText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});
