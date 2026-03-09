import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Alert, Modal
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
  title: string;
  description: string;
  durationMinutes: number;
  xpReward: number;
  category: 'mindfulness' | 'social' | 'movement' | 'self_care' | 'reflection';
  moodThreshold?: number;
  emoji: string;
}

const TASKS: DailyTask[] = [
  { id: 'task_water', title: 'Ek glass paani pi', description: '2 minutes. Bas itna. Hydration is self-care.', durationMinutes: 2, xpReward: 10, category: 'self_care', emoji: '💧', moodThreshold: 3 },
  { id: 'task_breath', title: '4-7-8 Breathing', description: '4 sec inhale, hold 7, exhale 8. Do 3 rounds.', durationMinutes: 5, xpReward: 20, category: 'mindfulness', emoji: '🌬️' },
  { id: 'task_walk', title: '10 min walk — no phone', description: 'Bahar ja. Kuch mat dekh. Bas chal. Fresh air works.', durationMinutes: 10, xpReward: 30, category: 'movement', emoji: '🚶' },
  { id: 'task_journal', title: '3 cheezein likh', description: 'Aaj 3 cheezein jo theek thin. Chhoti bhi chalti hai.', durationMinutes: 5, xpReward: 25, category: 'reflection', emoji: '✍️' },
  { id: 'task_text_friend', title: 'Ek dost ko text kar', description: '"Kya haal hai?" — bas itna kaafi hai.', durationMinutes: 2, xpReward: 35, category: 'social', emoji: '📱', moodThreshold: 5 },
  { id: 'task_stretch', title: '5 min stretch', description: 'Neck, shoulders, back. Body ko thoda pyaar do.', durationMinutes: 5, xpReward: 20, category: 'movement', emoji: '🧘' },
  { id: 'task_cold_water', title: 'Cold water on face', description: 'Emergency reset. 30 seconds. Works every time.', durationMinutes: 1, xpReward: 15, category: 'self_care', emoji: '💦', moodThreshold: 4 },
  { id: 'task_song', title: 'Ek achha gaana sun', description: 'Jo favourite hai. Aankhein band. Sirf sun.', durationMinutes: 4, xpReward: 15, category: 'self_care', emoji: '🎵' },
  { id: 'task_new_person', title: 'Naye dost se baat kar', description: 'LinkedIn, college group, anywhere. Ek hello.', durationMinutes: 10, xpReward: 50, category: 'social', emoji: '🤝', moodThreshold: 7 },
  { id: 'task_gratitude', title: 'Gratitude note', description: 'Ek cheez likh jiske liye grateful hai aaj.', durationMinutes: 3, xpReward: 20, category: 'reflection', emoji: '🙏' },
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
  const [xpPopup, setXpPopup] = useState<{ xp: number; visible: boolean }>({ xp: 0, visible: false });
  const xpAnim = useRef(new Animated.Value(0)).current;
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
        if (score >= 5 && t.moodThreshold <= 3) return false;
        if (score < 3 && t.moodThreshold > 3) return false;
      }
      return true;
    }).slice(0, 6);
  };

  const handleComplete = async (task: DailyTask) => {
    if (completedIds.has(task.id)) return;

    // Show confirmation modal
    Alert.alert(
      language === 'english' ? `Mark "${task.title}" as Done?` : `"${task.title}" complete kiya?`,
      language === 'english'
        ? `You'll earn +${task.xpReward} XP for completing this!`
        : `+${task.xpReward} XP milega isko complete karne ke liye!`,
      [
        { text: language === 'english' ? 'Not yet' : 'Abhi nahi', style: 'cancel' },
        {
          text: language === 'english' ? 'Yes, Done! ✅' : 'Haan, Ho Gaya! ✅',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await markTaskCompleted(task.id, task.xpReward);

            // XP popup animation
            setXpPopup({ xp: task.xpReward, visible: true });
            Animated.sequence([
              Animated.spring(xpAnim, { toValue: 1, useNativeDriver: true }),
              Animated.delay(1500),
              Animated.timing(xpAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start(() => setXpPopup(p => ({ ...p, visible: false })));

            await loadData();
          },
        },
      ]
    );
  };

  const currentLevelIndex = LEVELS.findIndex(l => l.title === (stats?.current_level ?? 'Naya Bro'));
  const nextLevel = LEVELS[currentLevelIndex + 1];
  const currentXP = stats?.total_xp ?? 0;
  const progressPct = nextLevel
    ? Math.min((currentXP - (LEVELS[currentLevelIndex]?.min ?? 0)) / (nextLevel.min - (LEVELS[currentLevelIndex]?.min ?? 0)), 1)
    : 1;

  const tasks = getAvailableTasks();
  const doneCount = tasks.filter(t => completedIds.has(t.id)).length;

  return (
    <View style={styles.root}>
      <LinearGradient colors={[COLORS.background, '#0A0E1F']} style={StyleSheet.absoluteFillObject} />

      {/* XP Popup */}
      {xpPopup.visible && (
        <Animated.View
          style={[styles.xpPopup, {
            opacity: xpAnim,
            transform: [{ scale: xpAnim }, {
              translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] })
            }]
          }]}
        >
          <Text style={styles.xpPopupText}>+{xpPopup.xp} XP 🎉</Text>
        </Animated.View>
      )}

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>
            {language === 'english' ? 'Daily Challenges' : 'Aaj ka Challenge'}
          </Text>

          {/* Level Card */}
          <View style={styles.levelCard}>
            <LinearGradient colors={['#1A1060', '#0D1B40']} style={styles.levelGradient}>
              <View style={styles.levelRow}>
                <View>
                  <Text style={styles.levelTitle}>{stats?.current_level ?? 'Naya Bro'}</Text>
                  <Text style={styles.xpText}>{currentXP} XP</Text>
                </View>
                <Text style={styles.levelEmoji}>
                  {currentXP >= 1000 ? '🏆' : currentXP >= 600 ? '🦾' : currentXP >= 300 ? '💪' : currentXP >= 100 ? '📚' : '🌱'}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
              </View>
              <Text style={styles.nextLevelText}>
                {nextLevel ? `${nextLevel.min - currentXP} XP to ${nextLevel.title}` : 'Max level reached! 🏆'}
              </Text>
            </LinearGradient>
          </View>

          {/* Progress today */}
          <View style={styles.todayProgress}>
            <Text style={styles.todayText}>
              {language === 'english' ? `Today: ${doneCount}/${tasks.length} done` : `Aaj: ${doneCount}/${tasks.length} complete`}
            </Text>
            <View style={styles.todayBar}>
              {tasks.map((t, i) => (
                <View
                  key={t.id}
                  style={[styles.todayDot, completedIds.has(t.id) && styles.todayDotDone]}
                />
              ))}
            </View>
          </View>

          {/* Tasks */}
          <Text style={styles.sectionLabel}>
            {language === 'english' ? 'YOUR TASKS' : 'TERA KAAM'}
          </Text>
          {tasks.map(task => (
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
            <LinearGradient colors={['#1A1020', '#0D1028']} style={styles.streakGradient}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <View>
                <Text style={styles.streakCount}>{stats?.streak_days ?? 0} day streak</Text>
                <Text style={styles.streakSub}>
                  {language === 'english' ? 'Keep going bhai!' : 'Chalta reh bhai!'}
                </Text>
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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[styles.taskCard, { transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient
        colors={completed ? ['#1A1A2E', '#1A1A2E'] : [COLORS.card, COLORS.surfaceElevated]}
        style={[styles.taskGradient, completed && styles.taskCompleted]}
      >
        <View style={[styles.taskIconWrap, { backgroundColor: color + '20' }]}>
          <Text style={{ fontSize: 22 }}>{task.emoji}</Text>
        </View>
        <View style={styles.taskBody}>
          <Text style={[styles.taskTitle, completed && styles.taskTitleDone]}>{task.title}</Text>
          <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>
          <View style={styles.taskMeta}>
            <View style={[styles.categoryChip, { backgroundColor: color + '20', borderColor: color + '40' }]}>
              <Text style={[styles.categoryText, { color }]}>{task.category.replace('_', ' ')}</Text>
            </View>
            <Text style={styles.taskDuration}>⏱ {task.durationMinutes}m</Text>
            <Text style={styles.taskXP}>+{task.xpReward} XP</Text>
          </View>
        </View>

        {/* Explicit complete button — not just tapping the whole card */}
        <TouchableOpacity
          style={[styles.completeBtn, completed && styles.completeBtnDone]}
          onPress={() => !completed && onComplete(task)}
          disabled={completed}
          activeOpacity={0.8}
        >
          {completed
            ? <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
            : (
              <View style={styles.completeBtnInner}>
                <Ionicons name="checkmark" size={16} color={COLORS.primary} />
              </View>
            )
          }
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },

  xpPopup: {
    position: 'absolute', top: '40%', alignSelf: 'center',
    backgroundColor: COLORS.success, borderRadius: RADIUS.full,
    paddingHorizontal: 28, paddingVertical: 14, zIndex: 999,
    shadowColor: COLORS.success, shadowOpacity: 0.6, shadowRadius: 20,
  },
  xpPopupText: { fontSize: 22, fontWeight: '900', color: '#fff' },

  levelCard: { marginBottom: 12, borderRadius: RADIUS.xl, overflow: 'hidden' },
  levelGradient: { padding: 20, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  levelTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  xpText: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  levelEmoji: { fontSize: 32 },
  progressTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  nextLevelText: { fontSize: 11, color: COLORS.textMuted },

  todayProgress: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  todayText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  todayBar: { flexDirection: 'row', gap: 5, flex: 1 },
  todayDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border, flex: 1 },
  todayDotDone: { backgroundColor: COLORS.success },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 10,
  },

  taskCard: { marginBottom: 10, borderRadius: RADIUS.xl, overflow: 'hidden' },
  taskGradient: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  taskCompleted: { opacity: 0.55 },
  taskIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  taskBody: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  taskDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 7 },
  taskMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  categoryChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  categoryText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  taskDuration: { fontSize: 11, color: COLORS.textMuted },
  taskXP: { fontSize: 11, fontWeight: '700', color: COLORS.warning },

  completeBtn: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  completeBtnDone: {},
  completeBtnInner: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.primaryGlow,
  },

  streakCard: { marginTop: 8, borderRadius: RADIUS.xl, overflow: 'hidden' },
  streakGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
  },
  streakEmoji: { fontSize: 32 },
  streakCount: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  streakSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});