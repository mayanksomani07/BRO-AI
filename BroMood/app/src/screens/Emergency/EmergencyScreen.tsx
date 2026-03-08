import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUserStore } from '../../store/userStore';
import { COLORS, RADIUS } from '../../constants/theme';

const HELPLINES = [
  { name: 'iCall', number: '9152987821', desc: 'Free, counsellors available', hours: 'Mon–Sat, 8am–10pm', flag: '🇮🇳' },
  { name: 'Vandrevala Foundation', number: '18602662345', desc: 'Free, anonymous', hours: '24/7', flag: '🇮🇳' },
  { name: 'NIMHANS', number: '08046110007', desc: 'National mental health helpline', hours: '24/7', flag: '🇮🇳' },
  { name: 'Tele MANAS', number: '14416', desc: 'Govt helpline, 20+ languages', hours: '24/7', flag: '🏥' },
  { name: 'Snehi', number: '04424640050', desc: 'Suicide prevention', hours: '24/7', flag: '💛' },
];

export default function EmergencyScreen() {
  const navigation = useNavigation();
  const { language } = useUserStore();

  const call = (number: string) => Linking.openURL(`tel:${number}`);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0010', '#0A0014', COLORS.background]}
        style={StyleSheet.absoluteFillObject}
      />
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>💙</Text>
          <Text style={styles.heroTitle}>
            {language === 'english' ? "You're not alone." : 'Tu akela nahi hai.'}
          </Text>
          <Text style={styles.heroSub}>
            {language === 'english'
              ? "These people are here to listen — right now, for free."
              : "Ye log abhi sun'ne ke liye available hain — bilkul free."}
          </Text>
        </View>

        {/* Helplines */}
        {HELPLINES.map(h => (
          <TouchableOpacity
            key={h.name}
            style={styles.helplineCard}
            onPress={() => call(h.number)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.card, COLORS.surfaceElevated]}
              style={styles.helplineGradient}
            >
              <View style={styles.helplineLeft}>
                <Text style={styles.helplineFlag}>{h.flag}</Text>
                <View>
                  <Text style={styles.helplineName}>{h.name}</Text>
                  <Text style={styles.helplineDesc}>{h.desc}</Text>
                  <Text style={styles.helplineHours}>🕐 {h.hours}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => call(h.number)}
              >
                <LinearGradient
                  colors={[COLORS.danger, '#CC0033']}
                  style={styles.callBtnGrad}
                >
                  <Ionicons name="call" size={16} color="#fff" />
                  <Text style={styles.callNumber}>{h.number}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        {/* Chat CTA */}
        <TouchableOpacity
          style={styles.chatCTA}
          onPress={() => { navigation.goBack(); }}
          activeOpacity={0.8}
        >
          <View style={styles.chatCTAInner}>
            <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary} />
            <Text style={styles.chatCTAText}>
              {language === 'english'
                ? 'Continue chatting with Bro_AI'
                : 'Bro_AI se baat karo'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          {language === 'english'
            ? "BroMood is not a medical device. It's a support companion. For emergencies, please call the helplines above."
            : 'BroMood doctor nahi hai. Sirf ek dost ki tarah support karta hai. Emergency mein upar wale helplines pe call karo.'}
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

  closeBtn: {
    alignSelf: 'flex-end', marginBottom: 16,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    padding: 8, borderWidth: 1, borderColor: COLORS.border,
  },

  hero: { alignItems: 'center', marginBottom: 28 },
  heroEmoji: { fontSize: 52, marginBottom: 12 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  heroSub: {
    fontSize: 15, color: COLORS.textSecondary, textAlign: 'center',
    marginTop: 8, lineHeight: 22, paddingHorizontal: 20,
  },

  helplineCard: { marginBottom: 10, borderRadius: RADIUS.xl, overflow: 'hidden' },
  helplineGradient: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'space-between',
  },
  helplineLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  helplineFlag: { fontSize: 24 },
  helplineName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  helplineDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  helplineHours: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  callBtn: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  callBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  callNumber: { fontSize: 12, fontWeight: '700', color: '#fff' },

  chatCTA: {
    marginTop: 16, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.primary + '40',
    backgroundColor: COLORS.primaryGlow,
  },
  chatCTAInner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16,
  },
  chatCTAText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },

  disclaimer: {
    fontSize: 11, color: COLORS.textMuted, textAlign: 'center',
    marginTop: 24, lineHeight: 17, paddingHorizontal: 10,
  },
});
