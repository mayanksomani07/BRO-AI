import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Animated, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useMoodStore } from '../../store/moodStore';
import { useUserStore } from '../../store/userStore';
import { COLORS, getMoodColor, getMoodLabel, RADIUS } from '../../constants/theme';
import MoodRing from '../../components/MoodRing';
import MoodChart from '../../components/MoodChart';
import MotivationCard from '../../components/MotivationCard';
import { TaskCard } from '../../components/TaskCard';
import EmergencyButton from '../../components/EmergencyButton';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { currentSnapshot, history, showEmergencyBanner, dismissEmergencyBanner, recalculateMoodScore } = useMoodStore();
  const { name, language } = useUserStore();
  const score = currentSnapshot?.score ?? 5.0;
  const moodColor = getMoodColor(score);
  const bannerAnim = useRef(new Animated.Value(showEmergencyBanner ? 1 : 0)).current;

  useEffect(() => {
    recalculateMoodScore();
  }, []);

  useEffect(() => {
    Animated.timing(bannerAnim, {
      toValue: showEmergencyBanner ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [showEmergencyBanner]);

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? t('home.greeting_morning', { name })
    : hour < 18
    ? t('home.greeting_afternoon', { name })
    : t('home.greeting_night', { name });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.background, '#0A0E1F', COLORS.background]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Emergency Banner */}
      {showEmergencyBanner && (
        <Animated.View style={[styles.emergencyBanner, { opacity: bannerAnim }]}>
          <TouchableOpacity
            style={styles.emergencyBannerInner}
            onPress={() => navigation.navigate('Emergency')}
            activeOpacity={0.8}
          >
            <Ionicons name="warning" size={18} color="#fff" />
            <Text style={styles.emergencyBannerText}>
              {language === 'english' ? "You're not alone. Get help now." : 'Tu akela nahi hai. Madad le abhi.'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={dismissEmergencyBanner} style={styles.bannerClose}>
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.subGreeting}>
                {language === 'english' ? "How are you feeling today?" : 'Aaj ka mood kaisa hai?'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <LinearGradient
                colors={[moodColor + '40', moodColor + '20']}
                style={styles.profileGradient}
              >
                <Text style={styles.profileInitial}>{name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Mood Ring Card */}
          <View style={styles.moodCard}>
            <LinearGradient
              colors={[COLORS.card, COLORS.surfaceElevated]}
              style={styles.moodCardGradient}
            >
              <Text style={styles.sectionLabel}>{t('home.mood_label')}</Text>
              <MoodRing score={score} size={160} />
              <Text style={[styles.moodLabel, { color: moodColor }]}>
                {getMoodLabel(score, language)}
              </Text>
              {currentSnapshot && (
                <Text style={styles.trendText}>
                  {currentSnapshot.trendSlope > 0.1
                    ? (language === 'english' ? '↑ Improving trend' : '↑ Better ho raha hai')
                    : currentSnapshot.trendSlope < -0.1
                    ? (language === 'english' ? '↓ Declining trend' : '↓ Neeche ja raha hai')
                    : (language === 'english' ? '→ Stable' : '→ Stable hai')}
                </Text>
              )}
            </LinearGradient>
          </View>

          {/* 7-Day Chart */}
          <View style={styles.chartCard}>
            <LinearGradient colors={[COLORS.card, COLORS.surfaceElevated]} style={styles.chartGradient}>
              <Text style={styles.sectionLabel}>
                {language === 'english' ? '7-Day Mood' : '7 Din ka Mood'}
              </Text>
              <MoodChart data={history.slice(-7)} />
            </LinearGradient>
          </View>

          {/* Motivation Card */}
          <MotivationCard language={language} moodScore={score} />

          {/* Today's Task */}
          <TaskCard moodScore={score} language={language} />

          {/* Chat CTA */}
          <TouchableOpacity
            style={styles.chatCTA}
            onPress={() => navigation.navigate('Chat')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.chatCTAGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
              <Text style={styles.chatCTAText}>
                {language === 'english' ? 'Chat with Bro_AI' : 'Bro_AI se baat kar'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <QuickAction
              icon="musical-notes"
              label={language === 'english' ? 'Calm Music' : 'Music'}
              onPress={() => navigation.navigate('Music')}
              color="#A78BFA"
            />
            <QuickAction
              icon="people"
              label={language === 'english' ? 'Therapists' : 'Therapist'}
              onPress={() => navigation.navigate('Therapist')}
              color="#34D399"
            />
            <QuickAction
              icon="book"
              label={language === 'english' ? 'Journal' : 'Journal'}
              onPress={() => navigation.navigate('Journal')}
              color="#60A5FA"
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Emergency FAB */}
      <EmergencyButton />
    </View>
  );
}

function QuickAction({ icon, label, onPress, color }: {
  icon: string; label: string; onPress: () => void; color: string;
}) {
  return (
    <TouchableOpacity style={styles.quickActionBtn} onPress={onPress} activeOpacity={0.75}>
      <LinearGradient
        colors={[color + '25', color + '10']}
        style={styles.quickActionGradient}
      >
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={[styles.quickActionLabel, { color }]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  emergencyBanner: {
    backgroundColor: COLORS.danger,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 100,
  },
  emergencyBannerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emergencyBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  bannerClose: { padding: 4 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileBtn: { width: 44, height: 44, borderRadius: 22 },
  profileGradient: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  profileInitial: {
    fontSize: 18, fontWeight: '700', color: COLORS.textPrimary,
  },

  moodCard: { marginBottom: 16, borderRadius: RADIUS.xl, overflow: 'hidden' },
  moodCardGradient: {
    padding: 24,
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  moodLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  trendText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  chartCard: { marginBottom: 16, borderRadius: RADIUS.xl, overflow: 'hidden' },
  chartGradient: {
    padding: 20,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  chatCTA: { marginVertical: 16, borderRadius: RADIUS.xl, overflow: 'hidden' },
  chatCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 12,
    borderRadius: RADIUS.xl,
  },
  chatCTAText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  quickActionBtn: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  quickActionGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
