import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS } from '../../constants/theme';

const { width } = Dimensions.get('window');

const CONSENT_ITEMS = [
  { icon: 'lock-closed', title: 'Never sold', desc: 'Your data stays with you. Always.' },
  { icon: 'phone-portrait', title: 'On-device first', desc: 'All mood calculations happen locally.' },
  { icon: 'eye-off', title: 'Keyboard privacy', desc: 'Only typing speed, never actual text.' },
  { icon: 'trash', title: 'Delete anytime', desc: 'One tap to wipe everything.' },
];

export default function ConsentScreen() {
  const navigation = useNavigation<any>();
  const [agreed, setAgreed] = useState(false);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#080B14', '#0A0F20']} style={StyleSheet.absoluteFillObject} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>Tera data, teri privacy</Text>
        <Text style={styles.sub}>
          BroMood collects minimal data — only to support you. Here's exactly what we do and don't do:
        </Text>

        {CONSENT_ITEMS.map(item => (
          <View key={item.title} style={styles.consentItem}>
            <View style={styles.consentIcon}>
              <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
            </View>
            <View style={styles.consentText}>
              <Text style={styles.consentTitle}>{item.title}</Text>
              <Text style={styles.consentDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.disclaimerText}>
            BroMood doctor nahi hai. Sirf ek dost ki tarah support karta hai. Emergency mein iCall: 9152987821 pe call karo.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.agreeRow}
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
            {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={styles.agreeText}>
            I understand and agree to BroMood's privacy terms
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctaBtn, !agreed && styles.ctaBtnDisabled]}
          onPress={() => agreed && navigation.navigate('BaselineSetup')}
          activeOpacity={agreed ? 0.85 : 1}
        >
          <LinearGradient
            colors={agreed ? [COLORS.primary, COLORS.primaryDark] : [COLORS.surface, COLORS.surface]}
            style={styles.ctaGradient}
          >
            <Text style={[styles.ctaText, !agreed && { color: COLORS.textMuted }]}>
              Continue →
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Go back</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 24, paddingTop: 80 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 12 },
  sub: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 28 },

  consentItem: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    marginBottom: 16, padding: 16,
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  consentIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center', alignItems: 'center',
  },
  consentText: { flex: 1 },
  consentTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  consentDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },

  disclaimer: {
    flexDirection: 'row', gap: 8, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: 14, marginVertical: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },

  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  agreeText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  ctaBtn: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 14 },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaGradient: { paddingVertical: 18, alignItems: 'center' },
  ctaText: { fontSize: 17, fontWeight: '800', color: '#fff' },

  backBtn: { alignItems: 'center', paddingVertical: 8 },
  backText: { fontSize: 14, color: COLORS.textMuted },
});
