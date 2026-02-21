import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useMood } from '@/lib/mood-context';
import { MOOD_CONFIG, type MoodType } from '@/lib/mood-analyzer';
import { MoodTrendChart } from '@/components/MoodTrendChart';
import { MotivationModal } from '@/components/MotivationModal';
import colors from '@/constants/colors';

const { width } = Dimensions.get('window');

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RecentMoodPill({ mood }: { mood: MoodType }) {
  const config = MOOD_CONFIG[mood];
  return (
    <View style={[styles.moodPill, { backgroundColor: config.color + '15' }]}>
      <Ionicons name={config.icon as any} size={14} color={config.color} />
      <Text style={[styles.moodPillText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { moods, journals, stats, motivation, showMotivation, dismissMotivation } = useMood();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const latestMood = moods.length > 0 ? moods[0] : null;
  const latestConfig = latestMood ? MOOD_CONFIG[latestMood.mood] : null;

  const dominantMood = Object.entries(stats.moodCounts).sort((a, b) => b[1] - a[1])[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getSentimentEmoji = () => {
    if (stats.averageSentiment > 0.2) return 'Positive';
    if (stats.averageSentiment < -0.2) return 'Needs care';
    return 'Balanced';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.subtitle}>How are you feeling today?</Text>
          </View>
          {latestConfig && (
            <View style={[styles.currentMoodBadge, { backgroundColor: latestConfig.color + '15' }]}>
              <Ionicons name={latestConfig.icon as any} size={18} color={latestConfig.color} />
              <Text style={[styles.currentMoodText, { color: latestConfig.color }]}>{latestConfig.label}</Text>
            </View>
          )}
        </View>

        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.insightCard}
        >
          <View style={styles.insightHeader}>
            <Ionicons name="analytics" size={20} color="rgba(255,255,255,0.9)" />
            <Text style={styles.insightTitle}>Weekly Insight</Text>
          </View>
          {stats.totalEntries > 0 ? (
            <>
              <Text style={styles.insightText}>
                {dominantMood
                  ? `You've mostly felt ${MOOD_CONFIG[dominantMood[0] as MoodType]?.label?.toLowerCase() || 'okay'} this week.`
                  : 'Start logging moods to see insights.'}
              </Text>
              <View style={styles.insightStats}>
                <View style={styles.insightStatItem}>
                  <Text style={styles.insightStatValue}>{stats.totalEntries}</Text>
                  <Text style={styles.insightStatLabel}>entries</Text>
                </View>
                <View style={styles.insightDivider} />
                <View style={styles.insightStatItem}>
                  <Text style={styles.insightStatValue}>{stats.streak}</Text>
                  <Text style={styles.insightStatLabel}>day streak</Text>
                </View>
                <View style={styles.insightDivider} />
                <View style={styles.insightStatItem}>
                  <Text style={styles.insightStatValue}>{getSentimentEmoji()}</Text>
                  <Text style={styles.insightStatLabel}>journal mood</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.insightText}>
              Start logging your moods and writing journal entries to unlock personalized insights.
            </Text>
          )}
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Trend</Text>
          <View style={styles.chartCard}>
            <MoodTrendChart moods={moods} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="calendar"
              label="Streak"
              value={`${stats.streak} days`}
              color={colors.primary}
            />
            <StatCard
              icon="document-text"
              label="Journals"
              value={`${journals.length}`}
              color={colors.accent}
            />
          </View>
        </View>

        {moods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Moods</Text>
            <View style={styles.recentMoods}>
              {moods.slice(0, 8).map((m) => (
                <RecentMoodPill key={m.id} mood={m.mood} />
              ))}
            </View>
          </View>
        )}

        {moods.length === 0 && journals.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="leaf" size={48} color={colors.primary} />
            <Text style={styles.emptyTitle}>Welcome to MoodGuard</Text>
            <Text style={styles.emptyText}>
              Start by checking in with how you feel, or write in your journal. We'll track your patterns and send you encouragement when you need it.
            </Text>
          </View>
        )}
      </ScrollView>

      {motivation && (
        <MotivationModal
          visible={showMotivation}
          title={motivation.title}
          message={motivation.message}
          onDismiss={dismissMotivation}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  greeting: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 4,
  },
  currentMoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  currentMoodText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  insightCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 16,
  },
  insightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 14,
  },
  insightStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  insightStatValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  insightStatLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  insightDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 12,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  recentMoods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  moodPillText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
