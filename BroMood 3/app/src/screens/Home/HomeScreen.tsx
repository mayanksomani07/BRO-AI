/**
 * HomeScreen — uses navigation PROP (not useNavigation hook) to avoid crashes.
 * Fully synced with TasksScreen via shared data/tasks.ts.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons }       from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { useMoodStore }    from '../../store/moodStore';
import { useUserStore }    from '../../store/userStore';
import { useTranslation }  from 'react-i18next';
import { COLORS, getMoodColor, getMoodLabel, RADIUS } from '../../constants/theme';
import MoodRing            from '../../components/MoodRing';
import MoodChart           from '../../components/MoodChart';
import MotivationCard      from '../../components/MotivationCard';
import EmergencyButton     from '../../components/EmergencyButton';
import MoodDebugPanel      from '../../components/MoodDebugPanel';
import DailyCheckIn        from '../../components/DailyCheckIn';
import MoodSignalBreakdown from '../../components/MoodSignalBreakdown';
import { getUserStats, getCompletedTaskIds, markTaskCompleted, getTodayXP, LEVELS } from '../../db/queries';
import { DailyTask, CATEGORY_COLORS, getAvailableTasks, getNextBonusTasks } from '../../data/tasks';

// ─── Level helpers ─────────────────────────────────────────────────────────────
function getLevelIndex(xp: number) {
  const idx = LEVELS.findIndex(l => xp >= l.min && xp <= l.max);
  return idx < 0 ? 0 : idx;
}
function getLevelProgress(xp: number) {
  const idx = getLevelIndex(xp);
  const l   = LEVELS[idx];
  const range = l.max === Infinity ? 500 : l.max - l.min;
  return { pct: Math.min((xp - l.min) / Math.max(range, 1), 1), needed: l.max === Infinity ? 0 : l.max - xp + 1 };
}

// ─── XP Card ──────────────────────────────────────────────────────────────────
function XPCard({ xp: xpAmount, levelTitle, streak }: { xp: number; levelTitle: string; streak: number }) {
  const { pct, needed } = getLevelProgress(xpAmount);
  const lvlNum = getLevelIndex(xpAmount) + 1;
  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(barAnim, { toValue: pct, useNativeDriver: false, tension: 40, friction: 8 }).start();
  }, [pct]);
  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const emoji    = xpAmount >= 1001 ? '🏆' : xpAmount >= 601 ? '⚡' : xpAmount >= 301 ? '🔥' : xpAmount >= 101 ? '💪' : '🌱';

  return (
    <View style={xp.card}>
      <LinearGradient colors={['#1E1B4B', '#312E81']} style={xp.grad}>
        <View style={xp.glowOrb} />
        <View style={xp.topRow}>
          <View style={{ flex: 1 }}>
            <View style={xp.levelBadge}><Text style={xp.levelBadgeTxt}>LVL {lvlNum}</Text></View>
            <Text style={xp.levelName}>{levelTitle}</Text>
            <Text style={xp.xpCount}>{xpAmount} XP total</Text>
          </View>
          <View style={xp.emojiCircle}>
            <Text style={{ fontSize: 22 }}>{emoji}</Text>
          </View>
        </View>
        <View style={xp.barSection}>
          <View style={xp.barTrack}>
            <Animated.View style={[xp.barFill, { width: barWidth }]} />
            {[0.25, 0.5, 0.75].map(m => <View key={m} style={[xp.milestone, { left: `${m * 100}%` as any }]} />)}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={xp.barLabel}>0%</Text>
            <Text style={xp.barLabel}>{Math.round(pct * 100)}%</Text>
            <Text style={xp.barLabel}>100%</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, flex: 1 }}>
            {needed > 0 ? `${needed} XP to next level` : '🏆 Max level!'}
          </Text>
          <View style={xp.streakChip}>
            <Text style={{ fontSize: 14 }}>🔥</Text>
            <Text style={xp.streakTxt}>{streak} day streak</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Mini Task Card ────────────────────────────────────────────────────────────
function MiniTaskCard({ task, completed, onComplete }: {
  task: DailyTask; completed: boolean; onComplete: (t: DailyTask) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [countdown,  setCountdown]  = useState(3);
  const color = CATEGORY_COLORS[task.category];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Auto-dismiss confirm after 3 seconds with countdown
  useEffect(() => {
    if (!confirming) { setCountdown(3); return; }
    setCountdown(3);
    const t1 = setTimeout(() => setCountdown(2), 1000);
    const t2 = setTimeout(() => setCountdown(1), 2000);
    const t3 = setTimeout(() => setConfirming(false), 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [confirming]);

  const handlePress = async () => {
    if (completed || loading) return;
    if (!confirming) {
      setConfirming(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    }
    setLoading(true);
    setConfirming(false);
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
    try { await onComplete(task); } finally {
      setLoading(false);
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View style={[mt.card, completed && mt.cardDone, confirming && mt.cardConfirm]}>
        <View style={[mt.emojiBox, { backgroundColor: completed ? '#1a2a1a' : color + '22' }]}>
          {completed
            ? <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            : <Text style={{ fontSize: 16 }}>{task.emoji}</Text>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[mt.title, completed && mt.titleDone]} numberOfLines={1}>{task.title}</Text>
          <View style={mt.meta}>
            <Text style={[mt.xp, { color }]}>+{task.xpReward} XP</Text>
            <Text style={mt.dur}>{task.durationMinutes}m</Text>
          </View>
        </View>
        {!completed && (
          confirming ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[mt.cancelBtn]}
                onPress={() => setConfirming(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={12} color={COLORS.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={mt.confirmBtn}
                onPress={handlePress}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={13} color="#fff" />
                <Text style={mt.confirmTxt}>Done ({countdown})</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[mt.btn, { backgroundColor: color + '18', borderColor: color + '50' }]}
              onPress={handlePress}
              activeOpacity={0.7}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color={color} />
                : <>
                    <Ionicons name="checkmark-outline" size={13} color={color} />
                    <Text style={[mt.btnTxt, { color }]}>Done</Text>
                  </>
              }
            </TouchableOpacity>
          )
        )}
        {completed && (
          <View style={mt.donedot}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: { navigation?: any }) {
  // Safe navigate — won't crash if navigation prop is missing
  const nav = (screen: string) => { try { navigation?.navigate(screen); } catch {} };

  const { t } = useTranslation();
  const { currentSnapshot, history, showEmergencyBanner,
          dismissEmergencyBanner, recalculateMoodScore, applyCheckIn } = useMoodStore();
  const { name, language } = useUserStore();

  const score = currentSnapshot?.score ?? 5;

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [bonusTasks,   setBonusTasks]   = useState<DailyTask[]>([]);
  const [bonusPage,    setBonusPage]    = useState(0);
  const [wantBonus,    setWantBonus]    = useState(false);
  const [stats,        setStats]        = useState({ xp: 0, level: 'Naya Bro', streak: 0 });
  const [todayXp,      setTodayXp]      = useState(0);
  const [showCheckIn,  setShowCheckIn]  = useState(false);
  const [xpPopup,      setXpPopup]      = useState<{ xp: number; visible: boolean }>({ xp: 0, visible: false });
  const [levelUp,      setLevelUp]      = useState<string | null>(null);
  const xpAnim  = useRef(new Animated.Value(0)).current;
  const lvlAnim = useRef(new Animated.Value(0)).current;
  const prevLevel = useRef('');

  // Exactly same task list as TasksScreen
  const baseTasks  = getAvailableTasks(score);
  const doneCount  = baseTasks.filter(task => completedIds.has(task.id)).length;
  const allBaseDone = baseTasks.length > 0 && baseTasks.every(task => completedIds.has(task.id));

  const loadData = useCallback(async () => {
    try {
      const [ids, s, txp] = await Promise.all([getCompletedTaskIds(), getUserStats(), getTodayXP()]);
      const idSet = new Set(ids);
      setCompletedIds(idSet);
      setTodayXp(txp);
      if (s) {
        const newLvl = s.current_level;
        if (prevLevel.current && prevLevel.current !== newLvl) {
          setLevelUp(newLvl);
          Animated.spring(lvlAnim, { toValue: 1, useNativeDriver: true }).start();
          setTimeout(() => {
            Animated.timing(lvlAnim, { toValue: 0, duration: 300, useNativeDriver: true })
              .start(() => setLevelUp(null));
          }, 3000);
        }
        prevLevel.current = newLvl;
        setStats({ xp: s.total_xp, level: newLvl, streak: s.streak_days });
      }
      if (baseTasks.length > 0 && baseTasks.every(task => idSet.has(task.id)) && wantBonus) {
        setBonusTasks(prev => prev.length > 0 ? prev : getNextBonusTasks(idSet, 3));
      }
    } catch (e) { console.warn('HomeScreen loadData:', e); }
  }, [score, wantBonus]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  useEffect(() => { recalculateMoodScore().catch(() => {}); }, []);

  const handleComplete = async (task: DailyTask) => {
    if (completedIds.has(task.id)) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await markTaskCompleted(task.id, task.xpReward);
      setXpPopup({ xp: task.xpReward, visible: true });
      Animated.sequence([
        Animated.spring(xpAnim, { toValue: 1, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(xpAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setXpPopup(p => ({ ...p, visible: false })));
      await loadData();
    } catch (e) { console.warn('complete error:', e); }
  };

  const loadMoreBonus = () => {
    const seen = new Set([...completedIds, ...bonusTasks.map(task => task.id)]);
    setBonusTasks(getNextBonusTasks(seen, 3));
    setBonusPage(p => p + 1);
  };

  const handleWantBonus = () => {
    setWantBonus(true);
    const seen = new Set(completedIds);
    setBonusTasks(getNextBonusTasks(seen, 3));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? t('home.greeting_morning', { name })
    : hour < 18
      ? t('home.greeting_afternoon', { name })
      : t('home.greeting_night', { name });

  const moodColor = getMoodColor(score);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#080B14', '#0A0F20']} style={StyleSheet.absoluteFillObject} />

      {/* XP popup */}
      {xpPopup.visible && (
        <Animated.View style={[s.xpPopup, {
          opacity: xpAnim,
          transform: [
            { translateY: xpAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [30, -10, 0] }) },
            { scale: xpAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1.1, 1] }) },
          ],
        }]}>
          <Text style={{ fontSize: 16 }}>🪙</Text>
          <Text style={s.xpPopupTxt}>+{xpPopup.xp} XP</Text>
          <Text style={{ fontSize: 14 }}>✨</Text>
        </Animated.View>
      )}

      {/* Level-up banner */}
      {levelUp && (
        <Animated.View style={[s.levelUpBanner, {
          opacity: lvlAnim,
          transform: [{ scale: lvlAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
        }]}>
          <Text style={{ fontSize: 28 }}>🎊</Text>
          <View>
            <Text style={s.levelUpTitle}>Level Up!</Text>
            <Text style={s.levelUpSub}>{levelUp}</Text>
          </View>
        </Animated.View>
      )}

      {/* Emergency banner */}
      {showEmergencyBanner && (
        <TouchableOpacity style={s.emergencyBanner} onPress={() => nav('Emergency')}>
          <View style={s.bannerRow}>
            <Ionicons name="warning" size={16} color="#fff" />
            <Text style={s.bannerTxt}>{t('home.mood_very_low')}</Text>
          </View>
          <TouchableOpacity onPress={dismissEmergencyBanner} style={s.bannerClose}>
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.greeting}>{greeting}</Text>
              <Text style={s.greetingSub}>{t('home.greeting_sub')}</Text>
            </View>
            <LinearGradient colors={[moodColor + '40', moodColor + '20']} style={s.avatarGrad}>
              <Text style={s.avatarTxt}>{(name || 'B')[0].toUpperCase()}</Text>
            </LinearGradient>
          </View>

          {/* Mood ring card */}
          <View style={s.moodCard}>
            <LinearGradient colors={['#0F172A', '#1E293B']} style={s.moodCardGrad}>
              <View style={s.moodCardTop}>
                <Text style={s.sectionLabel}>MOOD SCORE</Text>
                <TouchableOpacity style={s.checkInPill} onPress={() => setShowCheckIn(true)}>
                  <Ionicons name="pulse" size={12} color={COLORS.warning} />
                  <Text style={[s.checkInTxt, { color: COLORS.warning }]}>Check-in</Text>
                </TouchableOpacity>
              </View>
              <MoodRing score={score} size={100} />
              <Text style={[s.moodLabel, { color: moodColor }]}>{getMoodLabel(score, language)}</Text>
              <Text style={s.trendTxt}>{t('home.signals_today')}</Text>
            </LinearGradient>
          </View>

          {/* Chart */}
          {history.length > 1 && (
            <View style={s.chartCard}>
              <LinearGradient colors={['#0F172A', '#1E293B']} style={s.chartGrad}>
                <Text style={s.sectionLabel}>{t('home.seven_day').toUpperCase()}</Text>
                <MoodChart data={history} />
              </LinearGradient>
            </View>
          )}

          {/* Signal breakdown */}
          <MoodSignalBreakdown
            signals={currentSnapshot?.signals ?? null}
            language={language}
            checkInDone={false}
            onCheckIn={() => setShowCheckIn(true)}
          />

          {/* XP Card */}
          <XPCard xp={stats.xp} levelTitle={stats.level} streak={stats.streak} />

          {/* Task progress strip */}
          <View style={s.progressStrip}>
            <View style={s.streakPill}>
              <Text style={s.streakNum}>{stats.streak}</Text>
              <Text style={s.streakUnit}>🔥</Text>
            </View>
            <Text style={s.progressTxt}>
              {doneCount}/{baseTasks.length} {t('home.tasks_done')}
            </Text>
            {todayXp > 0 && (
              <View style={s.todayXpChip}>
                <Text style={s.todayXpTxt}>+{todayXp} XP ✨</Text>
              </View>
            )}
            <View style={s.dotRow}>
              {baseTasks.map(task => (
                <View key={task.id} style={[s.dot, completedIds.has(task.id) && s.dotDone]} />
              ))}
            </View>
          </View>

          {/* ── TASKS SECTION (same as TasksScreen) ── */}
          <View style={s.taskHeaderRow}>
            <Text style={s.taskSectionLabel}>{t('home.tasks_title').toUpperCase()}</Text>
            <TouchableOpacity style={s.seeAll} onPress={() => nav('Tasks')}>
              <Text style={s.seeAllTxt}>{t('home.see_all')}</Text>
              <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {baseTasks.slice(0, 4).map(task => (
            <MiniTaskCard
              key={task.id}
              task={task}
              completed={completedIds.has(task.id)}
              onComplete={handleComplete}
            />
          ))}

          {/* All done + ask for bonus */}
          {allBaseDone && (
            <View style={s.allDoneBanner}>
              <Text style={{ fontSize: 22 }}>🎉</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.allDoneTitle}>{t('tasks.all_done_title')}</Text>
                <Text style={s.allDoneSub}>
                  {t('tasks.all_done_sub', { xp: todayXp })}
                </Text>
              </View>
            </View>
          )}

          {allBaseDone && !wantBonus && (
            <TouchableOpacity style={s.wantBonusBtn} onPress={handleWantBonus} activeOpacity={0.85}>
              <Text style={{ fontSize: 18 }}>⚡</Text>
              <Text style={s.wantBonusTxt}>{t('tasks.want_bonus')}</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          )}

          {allBaseDone && wantBonus && bonusTasks.length > 0 && (
            <>
              <View style={s.bonusHeader}>
                <Text style={s.bonusLabel}>⚡ BONUS</Text>
                <TouchableOpacity style={s.refreshBtn} onPress={loadMoreBonus}>
                  <Ionicons name="refresh" size={11} color={COLORS.primary} />
                  <Text style={s.refreshTxt}>{t('tasks.new_set')}</Text>
                </TouchableOpacity>
              </View>
              {bonusTasks.map(task => (
                <MiniTaskCard key={task.id + bonusPage} task={task} completed={completedIds.has(task.id)} onComplete={handleComplete} />
              ))}
              <TouchableOpacity style={s.moreBonusBtn} onPress={loadMoreBonus}>
                <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                <Text style={s.moreBonusTxt}>{t('tasks.load_more')}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Motivation */}
          <MotivationCard moodScore={score} language={language} />

          {/* Debug panel */}
          <MoodDebugPanel signals={currentSnapshot?.signals ?? null} moodScore={score} language={language} />

          {/* Quick Access */}
          <Text style={s.quickLabel}>{t('home.quick_access')}</Text>
          <View style={s.ctaRow}>
            <TouchableOpacity style={[s.ctaCard, { flex: 1 }]} onPress={() => nav('Bro_AI')} activeOpacity={0.85}>
              <LinearGradient colors={[COLORS.primary, '#3730A3']} style={s.ctaGrad}>
                <View style={s.ctaIcon}><Ionicons name="chatbubble-ellipses" size={20} color="#fff" /></View>
                <View><Text style={s.ctaTitle}>Bro AI</Text><Text style={s.ctaSub}>{t('home.bro_ai_sub')}</Text></View>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[s.ctaCard, { flex: 1 }]} onPress={() => nav('Journal')} activeOpacity={0.85}>
              <LinearGradient colors={['#0F4C75', '#1B6CA8']} style={s.ctaGrad}>
                <View style={s.ctaIcon}><Ionicons name="book" size={20} color="#fff" /></View>
                <View><Text style={s.ctaTitle}>Journal</Text><Text style={s.ctaSub}>{t('home.journal_sub')}</Text></View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={s.ctaRow}>
            <TouchableOpacity style={[s.ctaCard, { flex: 1 }]} onPress={() => nav('Music')} activeOpacity={0.85}>
              <LinearGradient colors={['#7C2D9E', '#A855F7']} style={s.ctaGrad}>
                <View style={s.ctaIcon}><Ionicons name="musical-notes" size={20} color="#fff" /></View>
                <View><Text style={s.ctaTitle}>Music</Text><Text style={s.ctaSub}>{t('home.music_sub')}</Text></View>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[s.ctaCard, { flex: 1 }]} onPress={() => nav('Tasks')} activeOpacity={0.85}>
              <LinearGradient colors={['#064E3B', '#059669']} style={s.ctaGrad}>
                <View style={s.ctaIcon}><Ionicons name="checkbox" size={20} color="#fff" /></View>
                <View><Text style={s.ctaTitle}>Tasks</Text><Text style={s.ctaSub}>{doneCount}/{baseTasks.length} done</Text></View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={s.ctaRow}>
            <TouchableOpacity style={[s.ctaCard, { flex: 2 }]} onPress={() => nav('Therapist')} activeOpacity={0.85}>
              <LinearGradient colors={['#7C2020', '#DC2626']} style={s.ctaGrad}>
                <View style={s.ctaIcon}><Ionicons name="people" size={20} color="#fff" /></View>
                <View style={{ flex: 1 }}><Text style={s.ctaTitle}>{t('home.therapist_label')}</Text><Text style={s.ctaSub}>{t('home.therapist_sub')}</Text></View>
                <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.6)" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[s.ctaCard, { flex: 1 }]} onPress={() => nav('Settings')} activeOpacity={0.85}>
              <LinearGradient colors={['#1F2937', '#374151']} style={s.ctaGrad}>
                <View style={s.ctaIcon}><Ionicons name="settings" size={20} color="#fff" /></View>
                <View><Text style={s.ctaTitle}>Settings</Text><Text style={s.ctaSub}>{t('home.settings_sub')}</Text></View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>

      <EmergencyButton onPress={() => nav('Emergency')} />
      <DailyCheckIn
        visible={showCheckIn}
        onDismiss={() => setShowCheckIn(false)}
        onComplete={async (answers) => {
          await applyCheckIn(answers);
          setShowCheckIn(false);
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },
  safe:   { flex: 1 },
  content:{ paddingHorizontal: 18, paddingTop: 14 },

  xpPopup:    { position: 'absolute', top: 80, alignSelf: 'center', zIndex: 999, backgroundColor: '#4F46E5', paddingHorizontal: 22, paddingVertical: 11, borderRadius: RADIUS.full, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#4F46E5', shadowOpacity: 0.9, shadowRadius: 18 },
  xpPopupTxt: { color: '#fff', fontWeight: '900', fontSize: 17 },
  levelUpBanner: { position: 'absolute', top: '35%', alignSelf: 'center', zIndex: 998, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#4F46E5', borderRadius: RADIUS.xl, paddingHorizontal: 24, paddingVertical: 16, shadowColor: '#4F46E5', shadowOpacity: 0.8, shadowRadius: 30 },
  levelUpTitle:  { fontSize: 16, fontWeight: '900', color: '#fff' },
  levelUpSub:    { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  emergencyBanner: { backgroundColor: COLORS.danger, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, zIndex: 100 },
  bannerRow:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerTxt:  { flex: 1, color: '#fff', fontSize: 12, fontWeight: '600' },
  bannerClose:{ padding: 4 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingTop: 6, marginBottom: 18, gap: 12 },
  greeting:    { fontSize: 19, fontWeight: '700', color: COLORS.textPrimary },
  greetingSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  avatarGrad:  { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarTxt:   { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  moodCard:     { marginBottom: 14, borderRadius: RADIUS.xl, overflow: 'hidden' },
  moodCardGrad: { padding: 22, alignItems: 'center', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },
  moodCardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 14 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: COLORS.textMuted, textTransform: 'uppercase' },
  checkInPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.warning + '50', backgroundColor: COLORS.warning + '0F' },
  checkInTxt:   { fontSize: 10, fontWeight: '700' },
  moodLabel:    { fontSize: 18, fontWeight: '700', marginTop: 10 },
  trendTxt:     { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  chartCard:  { marginBottom: 14, borderRadius: RADIUS.xl, overflow: 'hidden' },
  chartGrad:  { padding: 18, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },
  progressStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, flexWrap: 'wrap' },
  streakPill:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.warning + '18', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.warning + '30' },
  streakNum:     { fontSize: 13, fontWeight: '800', color: COLORS.warning },
  streakUnit:    { fontSize: 10 },
  progressTxt:   { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  todayXpChip:   { backgroundColor: COLORS.primary + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary + '40' },
  todayXpTxt:    { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  dotRow:        { flexDirection: 'row', gap: 5 },
  dot:           { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border },
  dotDone:       { backgroundColor: COLORS.success },
  taskHeaderRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  taskSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: COLORS.textMuted, textTransform: 'uppercase' },
  seeAll:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllTxt: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  allDoneBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.success + '15', borderRadius: RADIUS.xl, padding: 16, marginVertical: 10, borderWidth: 1, borderColor: COLORS.success + '35' },
  allDoneTitle:  { fontSize: 13, fontWeight: '800', color: COLORS.success },
  allDoneSub:    { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  wantBonusBtn:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.primary + '12', borderRadius: RADIUS.xl, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.primary + '30' },
  wantBonusTxt:  { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.primary },
  bonusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 6 },
  bonusLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#A78BFA', textTransform: 'uppercase' },
  refreshBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary + '50', backgroundColor: COLORS.primary + '10' },
  refreshTxt:  { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  moreBonusBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, backgroundColor: COLORS.primary + '15', borderRadius: RADIUS.xl, marginTop: 8, borderWidth: 1, borderColor: COLORS.primary + '30' },
  moreBonusTxt:{ fontSize: 13, fontWeight: '700', color: COLORS.primary },
  quickLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  ctaRow:      { flexDirection: 'row', gap: 10, marginBottom: 10 },
  ctaCard:     { borderRadius: RADIUS.xl, overflow: 'hidden' },
  ctaGrad:     { padding: 14, borderRadius: RADIUS.xl, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 70 },
  ctaIcon:     { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  ctaTitle:    { fontSize: 13, fontWeight: '800', color: '#fff' },
  ctaSub:      { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
});

const xp = StyleSheet.create({
  card: { marginBottom: 16, borderRadius: RADIUS.xl, overflow: 'hidden' },
  grad: { padding: 20, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  glowOrb: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(99,102,241,0.08)' },
  topRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  levelBadge:   { alignSelf: 'flex-start', backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, marginBottom: 6 },
  levelBadgeTxt:{ fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  levelName:    { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  xpCount:      { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  emojiCircle:  { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', justifyContent: 'center', alignItems: 'center' },
  barSection:   { marginBottom: 14 },
  barTrack:     { height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'visible', marginBottom: 6, position: 'relative' },
  barFill:      { height: '100%', borderRadius: 5, backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.8, shadowRadius: 6 },
  milestone:    { position: 'absolute', top: -3, width: 2, height: 16, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 1 },
  barLabel:     { fontSize: 10, color: COLORS.textMuted },
  streakChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.warning + '18', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  streakTxt:    { fontSize: 12, fontWeight: '800', color: COLORS.warning },
});

const mt = StyleSheet.create({
  card:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  cardDone:    { opacity: 0.55 },
  cardConfirm: { borderColor: COLORS.success, borderWidth: 1.5, backgroundColor: '#0D1F0D' },
  emojiBox:    { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  title:       { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  titleDone:   { textDecorationLine: 'line-through', color: COLORS.textMuted },
  meta:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  xp:          { fontSize: 10, fontWeight: '800' },
  dur:         { fontSize: 10, color: COLORS.textMuted },
  btn:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.lg, borderWidth: 1 },
  btnTxt:      { fontSize: 11, fontWeight: '800' },
  cancelBtn:   { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  confirmBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.lg, backgroundColor: COLORS.success },
  confirmTxt:  { fontSize: 11, fontWeight: '800', color: '#fff' },
  donedot:     { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
});