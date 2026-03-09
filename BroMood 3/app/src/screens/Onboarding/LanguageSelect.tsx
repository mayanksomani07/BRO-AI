import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUserStore, AppLanguage } from '../../store/userStore';
import { COLORS, RADIUS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

const LANGUAGES: { key: AppLanguage; native: string; flag: string; subtitle: string }[] = [
  { key: 'hinglish', native: 'Hinglish', flag: '🇮🇳', subtitle: 'Hindi + English mix' },
  { key: 'hindi', native: 'हिंदी', flag: '🇮🇳', subtitle: 'Pure Hindi' },
  { key: 'english', native: 'English', flag: '🌍', subtitle: 'English only' },
  { key: 'bengali', native: 'বাংলা', flag: '🇧🇩', subtitle: 'Bengali' },
  { key: 'kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳', subtitle: 'Kannada' },
  { key: 'tamil', native: 'தமிழ்', flag: '🇮🇳', subtitle: 'Tamil' },
  { key: 'marathi', native: 'मराठी', flag: '🇮🇳', subtitle: 'Marathi' },
  { key: 'telugu', native: 'తెలుగు', flag: '🇮🇳', subtitle: 'Telugu' },
];

export default function LanguageSelectScreen() {
  const navigation = useNavigation<any>();
  const { setLanguage } = useUserStore();
  const [selected, setSelected] = useState<AppLanguage>('hinglish');

  const handleContinue = async () => {
    await setLanguage(selected);
    navigation.navigate('Consent');
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#080B14', '#0A0F20', '#080B14']}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Decorative circles */}
      <View style={styles.decoCircle1} />
      <View style={styles.decoCircle2} />

      <View style={styles.header}>
        <Text style={styles.appName}>BroMood</Text>
        <Text style={styles.headerTitle}>Apni bhasha chun 🌍</Text>
        <Text style={styles.headerSub}>Choose your comfort language</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.langGrid}
        showsVerticalScrollIndicator={false}
      >
        {LANGUAGES.map(lang => (
          <TouchableOpacity
            key={lang.key}
            style={[styles.langCard, selected === lang.key && styles.langCardSelected]}
            onPress={() => setSelected(lang.key)}
            activeOpacity={0.75}
          >
            <LinearGradient
              colors={selected === lang.key
                ? [COLORS.primary + '25', COLORS.primaryDark + '15']
                : [COLORS.card, COLORS.surface]}
              style={styles.langCardGradient}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langName, selected === lang.key && styles.langNameSelected]}>
                {lang.native}
              </Text>
              <Text style={styles.langSub}>{lang.subtitle}</Text>
              {selected === lang.key && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.ctaBtn} onPress={handleContinue} activeOpacity={0.85}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.ctaText}>Continue →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  decoCircle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: COLORS.primary + '08', top: -80, right: -80,
  },
  decoCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: COLORS.accent + '08', bottom: 100, left: -60,
  },
  header: { paddingTop: 80, paddingHorizontal: 28, paddingBottom: 24 },
  appName: {
    fontSize: 13, fontWeight: '800', letterSpacing: 3,
    color: COLORS.primary, textTransform: 'uppercase', marginBottom: 16,
  },
  headerTitle: { fontSize: 30, fontWeight: '900', color: COLORS.textPrimary, lineHeight: 36 },
  headerSub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 6 },

  langGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, paddingBottom: 20,
  },
  langCard: { width: (width - 52) / 2, borderRadius: RADIUS.xl, overflow: 'hidden' },
  langCardSelected: {
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  langCardGradient: {
    padding: 18, alignItems: 'center',
    borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: 'transparent',
    minHeight: 110,
  },
  langFlag: { fontSize: 28, marginBottom: 8 },
  langName: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  langNameSelected: { color: COLORS.primary },
  langSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  checkmark: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },

  footer: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  ctaBtn: { borderRadius: RADIUS.xl, overflow: 'hidden' },
  ctaGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: RADIUS.xl },
  ctaText: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
});
