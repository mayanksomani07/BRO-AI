import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { COLORS, RADIUS } from '../../constants/theme';
import { useUserStore } from '../../store/userStore';
import { useMoodStore } from '../../store/moodStore';
import { getUserStats, markTaskCompleted, getCompletedTaskIds, getLevelForXP, LEVELS } from '../../db/queries';
import EmergencyButton from '../../components/EmergencyButton';

interface DailyTask {
  id: string;
  day: number;
  title: string;
  description: string;
  durationMinutes: number;
  xpReward: number;
  category: 'mindfulness' | 'social' | 'movement' | 'self_care' | 'reflection';
  moodThreshold?: number;
  emoji: string;
}

const TASKS: DailyTask[] = [
  { id: 'task_water', day: 1, title: 'Ek glass paani pi', description: '2 minutes. Bas itna.', durationMinutes: 2, xpReward: 10, category: 'self_care', emoji: '💧', moodThreshold: 3 },
  { id: 'task_breath', day: 1, title: '4-7-8 Breathing', description: '4 sec inhale, 7 hold, 8 exhale. 3 rounds.', durationMinutes: 5, xpReward: 20, category: 'mindfulness', emoji: '🌬️' },
  { id: 'task_walk', day: 1, title: '10 min walk — no phone', description: 'Bahar ja. Kuch mat dekh. Bas chal.', durationMinutes: 10, xpReward: 30, category: 'movement', emoji: '🚶' },
  { id: 'task_journal', day: 1, title: '3 cheezein likh', description: 'Aaj 3 cheezein jo theek thin.', durationMinutes: 5, xpReward: 25, category: 'reflection', emoji: '✍️' },
  { id: 'task_text_friend', day: 1, title: 'Ek dost ko text kar', description: '"Kya haal hai?" — bas itna kaafi hai.', durationMinutes: 2, xpReward: 35, category: 'social', emoji: '📱', moodThreshold: 5 },
  { id: 'task_stretch', day: 2, title: '5 min stretch', description: 'Neck, shoulders, back. Youtube dekh.', durationMinutes: 5, xpReward: 20, category: 'movement', emoji: '🧘' },
  { id: 'task_cold_water', day: 2, title: 'Cold water on face', description: 'Emergency reset. 30 seconds.', durationMinutes: 1, xpReward: 15, category: 'self_care', emoji: '💦', moodThreshold: 4 },
  { id: 'task_song', day: 2, title: 'Ek achha gaana sun', description: 'Jo favourite hai. Aankhein band. Sirf sun.', durationMinutes: 4, xpReward: 15, category: 'self_care', emoji: '🎵' },
  { id: 'task_new_person', day: 3, title: 'Naye dost se baat kar', description: 'LinkedIn, college group, anywhere. Ek hello.', durationMinutes: 10, xpReward: 50, category: 'social', emoji: '🤝', moodThreshold: 7 },
];

const CATEGORY_COLORS: Record<DailyTask['category'], string> = {
  mindfulness: '#A78BFA',
  social: '#34D399',
  movement: '#60A5FA',
  self_care: '#F59E0B',
  reflection: '#F472B6',
};

export default function TasksScreen() {
  const { language } = useUserStore();
  const { currentSnapshot } = useMoodStore();
  const [stats, setStats] = useState<{ total_xp: number; current_level: string; streak_days: number } | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [xpAnim] = useState(new Animated.Value(0));
  const score = currentSnapshot?.score ?? 5;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [s, ids] = await Promise.all([getUserStats(), getCompletedTaskIds()]);
    setStats(s);
    setCompletedIds(new Set(ids));
  };

  const getAvailableTasks = (): DailyTask[] => {
    return TASKS.filter(t => {
      if (t.moodThreshold !== undefined) {
        if (score >= 5 && t.moodThreshold <= 3) return false; // ultra-easy skip if mood is okay
        if (score < 3 && t.moodThreshold > 3) return false;  // skip hard tasks if critical
      }
      return true;
    }).slice(0, 5);
  };

  const handleComplete = async (task: DailyTask) => {
    if (completedIds.has(task.id)) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markTaskCompleted(task.id, task.xpReward);

    Animated.sequence([
      Animated.timing(xpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(xpAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    await loadData();
  };

  const currentLevelIndex = LEVELS.findIndex(l => l.title === (stats?.current_level ?? 'Naya Bro'));
  const nextLevel = LEVELS[currentLevelIndex + 1];
  const currentXP = stats?.total_xp ?? 0;
  const progressPct = nextLevel
    ? Math.min((currentXP - (LEVELS[currentLevelIndex]?.min ?? 0)) / (nextLevel.min - (LEVELS[currentLevelIndex]?.min ?? 0)), 1)
    : 1;

  return (
    <View style={styles.root}>
      <LinearGradient colors={[COLORS.background, '#0A0E1F']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>
            {language === 'english' ? 'Daily Challenges' : 'Aaj ka Challenge'}
          </Text>

          {/* Level Card */}
          <View style={styles.levelCard}>
            <LinearGradient
              colors={['#1A1060', '#0D1B40']}
              style={styles.levelGradient}
            >
              <View style={styles.levelRow}>
                <View>
                  <Text style={styles.levelTitle}>{stats?.current_level ?? 'Naya Bro'}</Text>
                  <Text style={styles.xpText}>{currentXP} XP</Text>
                </View>
                <Text style={styles.levelEmoji}>
                  {currentXP >= 1000 ? '🏆' : currentXP >= 600 ? '🦾' : currentXP >= 300 ? '💪' : currentXP >= 100 ? '📚' : '🌱'}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
              </View>
              {nextLevel && (
                <Text style={styles.nextLevelText}>
                  {nextLevel.min - currentXP} XP to {nextLevel.title}
                </Text>
              )}
            </LinearGradient>
          </View>

          {/* Mood Adaptive Notice */}
          <View style={styles.adaptiveNotice}>
            <Ionicons name="bulb-outline" size={14} color={COLORS.warning} />
            <Text style={styles.adaptiveText}>
              {score < 3
                ? (language === 'english' ? 'Easy tasks selected for tough days' : 'Aaj easy tasks — mushkil din ke liye')
                : score > 7
                ? (language === 'english' ? 'Stretch challenges unlocked!' : 'Stretch challenges unlock ho gaye!')
                : (language === 'english' ? 'Tasks matched to your current energy' : 'Tasks teri energy ke hisaab se')}
            </Text>
          </View>

          {/* Tasks */}
          {getAvailableTasks().map(task => (
            <TaskItem
              key={task.id}
              task={task}
              completed={completedIds.has(task.id)}
              onComplete={handleComplete}
              language={language}
            />
          ))}

          {/* Streak */}
          <View style={styles.streakCard}>
            <LinearGradient colors={[COLORS.card, COLORS.surfaceElevated]} style={styles.streakGradient}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <View>
                <Text style={styles.streakCount}>{stats?.streak_days ?? 0} {language === 'english' ? 'day streak' : 'din streak'}</Text>
                <Text style={styles.streakSub}>{language === 'english' ? 'Keep showing up, bro.' : 'Aata rehna, bhai.'}</Text>
              </View>
            </LinearGradient>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
      <EmergencyButton />
    </View>
  );
}

function TaskItem({ task, completed, onComplete, language }: {
  task: DailyTask; completed: boolean;
  onComplete: (t: DailyTask) => void; language: string;
}) {
  const color = CATEGORY_COLORS[task.category];
  const scaleAnim = new Animated.Value(1);

  const handlePress = () => {
    if (completed) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onComplete(task);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={styles.taskCard}>
        <LinearGradient
          colors={completed ? [COLORS.surface, COLORS.surface] : [COLORS.card, COLORS.surfaceElevated]}
          style={[styles.taskGradient, completed && styles.taskCompleted]}
        >
          <View style={[styles.taskEmoji, { backgroundColor: color + '20' }]}>
            <Text style={{ fontSize: 22 }}>{task.emoji}</Text>
          </View>
          <View style={styles.taskBody}>
            <Text style={[styles.taskTitle, completed && styles.taskTitleDone]}>{task.title}</Text>
            <Text style={styles.taskDesc}>{task.description}</Text>
            <View style={styles.taskMeta}>
              <View style={[styles.categoryChip, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                <Text style={[styles.categoryText, { color }]}>{task.category}</Text>
              </View>
              <Text style={styles.taskDuration}>⏱ {task.durationMinutes} min</Text>
            </View>
          </View>
          <View style={[styles.taskCheckbox, completed && { backgroundColor: COLORS.success, borderColor: COLORS.success }]}>
            {completed
              ? <Ionicons name="checkmark" size={16} color="#fff" />
              : <Text style={styles.xpLabel}>+{task.xpReward}</Text>
            }
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },

  levelCard: { marginBottom: 12, borderRadius: RADIUS.xl, overflow: 'hidden' },
  levelGradient: { padding: 20, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  levelTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  xpText: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  levelEmoji: { fontSize: 32 },
  progressBar: {
    height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: {
    height: '100%', backgroundColor: COLORS.primary, borderRadius: 3,
  },
  nextLevelText: { fontSize: 11, color: COLORS.textMuted },

  adaptiveNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.warning + '15', borderRadius: RADIUS.lg,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.warning + '30',
  },
  adaptiveText: { fontSize: 12, color: COLORS.warning, flex: 1 },

  taskCard: { marginBottom: 10, borderRadius: RADIUS.xl, overflow: 'hidden' },
  taskGradient: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  taskCompleted: { opacity: 0.5 },
  taskEmoji: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  taskBody: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  taskDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 8 },
  taskMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  categoryChip: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1,
  },
  categoryText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  taskDuration: { fontSize: 11, color: COLORS.textMuted },
  taskCheckbox: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  xpLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted },

  streakCard: { marginTop: 8, borderRadius: RADIUS.xl, overflow: 'hidden' },
  streakGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
  },
  streakEmoji: { fontSize: 32 },
  streakCount: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  streakSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
