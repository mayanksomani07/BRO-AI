/**
 * TasksScreen v6 — Fully re-designed task experience
 *
 * New features:
 * - XP persists across sessions (AsyncStorage fix in mock)
 * - Today's XP earned counter + animated bar
 * - 7-day streak calendar in XP card
 * - Task cards: tap "Mark Done" → confirm state → satisfying completion animation
 * - Scale + fade animation when task is marked complete
 * - Confetti-style "All done!" banner with total XP
 * - Bonus tasks: gated behind "I want more challenges 🎯" button
 * - Unlimited bonus/extra tasks from pool
 * - Better XP popup — large coin-bounce animation
 * - Full sync with HomeScreen via shared queries + useFocusEffect
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons }       from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics       from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { COLORS, RADIUS } from '../../constants/theme';
import { useUserStore }   from '../../store/userStore';
import { useMoodStore }   from '../../store/moodStore';
import {
  getUserStats, markTaskCompleted, getCompletedTaskIds,
  getTodayXP, getStreakCalendar, LEVELS,
} from '../../db/queries';
import { DailyTask, CATEGORY_COLORS, getAvailableTasks, getNextBonusTasks } from '../../data/tasks';
import EmergencyButton from '../../components/EmergencyButton';

// ── Level helpers ─────────────────────────────────────────────────────────────
function getLevelIndex(xp: number) {
  const idx = LEVELS.findIndex(l => xp >= l.min && xp <= l.max);
  return idx < 0 ? 0 : idx;
}
function getLevelProgress(xp: number) {
  const idx   = getLevelIndex(xp);
  const l     = LEVELS[idx];
  const range = l.max === Infinity ? 500 : l.max - l.min;
  return {
    pct:    Math.min((xp - l.min) / Math.max(range, 1), 1),
    needed: l.max === Infinity ? 0 : l.max - xp + 1,
    title:  l.title,
  };
}

// ── StreakCalendar ────────────────────────────────────────────────────────────
function StreakCalendar({ calendar }: { calendar: boolean[] }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date().getDay(); // 0=Sun
  const dayLabels = [...days.slice(today === 0 ? 0 : today), ...days.slice(0, today === 0 ? 0 : today)].slice(-7);

  return (
    <View style={cal.row}>
      {calendar.map((done, i) => {
        const isToday = i === 6;
        return (
          <View key={i} style={cal.cell}>
            <View style={[cal.dot, done && cal.dotDone, isToday && cal.dotToday]}>
              {done && <Text style={{ fontSize: 8 }}>✓</Text>}
            </View>
            <Text style={[cal.label, isToday && { color: COLORS.primary }]}>{dayLabels[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── XPCard ────────────────────────────────────────────────────────────────────
function XPCard({ xp, streak, todayXp, calendar }: {
  xp: number; streak: number; todayXp: number; calendar: boolean[];
}) {
  const { pct, needed, title } = getLevelProgress(xp);
  const lvlNum  = getLevelIndex(xp) + 1;
  const barAnim = useRef(new Animated.Value(0)).current;
  const todayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(barAnim, { toValue: pct, useNativeDriver: false, tension: 40, friction: 8 }).start();
  }, [pct]);

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const emoji    = xp >= 1001 ? '🏆' : xp >= 601 ? '⚡' : xp >= 301 ? '🔥' : xp >= 101 ? '💪' : '🌱';

  return (
    <View style={xpS.card}>
      <LinearGradient colors={['#1E1B4B', '#312E81']} style={xpS.grad}>
        <View style={xpS.glowOrb} />

        {/* Top row */}
        <View style={xpS.topRow}>
          <View style={{ flex: 1 }}>
            <View style={xpS.badgeRow}>
              <View style={xpS.badge}><Text style={xpS.badgeTxt}>LVL {lvlNum}</Text></View>
              {streak >= 2 && (
                <View style={xpS.streakBadge}>
                  <Text style={{ fontSize: 12 }}>🔥</Text>
                  <Text style={xpS.streakBadgeTxt}>{streak} day streak</Text>
                </View>
              )}
            </View>
            <Text style={xpS.levelName}>{title}</Text>
            <View style={xpS.xpRow}>
              <Text style={xpS.xpCount}>{xp} XP total</Text>
              {todayXp > 0 && (
                <View style={xpS.todayPill}>
                  <Text style={xpS.todayTxt}>+{todayXp} today ✨</Text>
                </View>
              )}
            </View>
          </View>
          <View style={xpS.emojiCircle}>
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={{ marginBottom: 14 }}>
          <View style={xpS.barTrack}>
            <Animated.View style={[xpS.barFill, { width: barWidth }]} />
            {[0.25, 0.5, 0.75].map(m => (
              <View key={m} style={[xpS.tick, { left: `${m * 100}%` as any }]} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={xpS.barLabel}>0%</Text>
            <Text style={xpS.barLabel}>{Math.round(pct * 100)}%</Text>
            <Text style={xpS.barLabel}>100%</Text>
          </View>
          <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' }}>
            {needed > 0 ? `${needed} XP to next level` : '🏆 Max level reached!'}
          </Text>
        </View>

        {/* 7-day calendar */}
        {calendar.length === 7 && (
          <>
            <View style={xpS.divider} />
            <Text style={xpS.calTitle}>LAST 7 DAYS</Text>
            <StreakCalendar calendar={calendar} />
          </>
        )}
      </LinearGradient>
    </View>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────
function TaskCard({
  task, completed: completedProp, isBonus, onComplete,
}: {
  task: DailyTask; completed: boolean; isBonus?: boolean;
  onComplete: (t: DailyTask) => Promise<void>;
}) {
  // Optimistic — flip to done immediately on confirm, don't wait for DB
  const [localDone, setLocalDone]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [countdown,  setCountdown]  = useState(3);
  const completed = completedProp || localDone;
  const color = CATEGORY_COLORS[task.category];
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const shakeAnim   = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!confirming) { setCountdown(3); progressAnim.setValue(0); return; }
    setCountdown(3);
    Animated.timing(progressAnim, { toValue: 1, duration: 3000, useNativeDriver: false }).start();
    const t1 = setTimeout(() => setCountdown(2), 1000);
    const t2 = setTimeout(() => setCountdown(1), 2000);
    const t3 = setTimeout(() => { setConfirming(false); }, 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [confirming]);

  const handlePress = async () => {
    if (completed || loading) return;
    if (!confirming) {
      setConfirming(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    }
    // Confirmed — optimistic update immediately
    setLocalDone(true);
    setLoading(true);
    setConfirming(false);
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start(() =>
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()
    );
    try { await onComplete(task); } catch { setLocalDone(false); } finally { setLoading(false); }
  };

  const handleCancel = () => {
    setConfirming(false);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: scaleAnim }], marginBottom: 10 }}>
      <LinearGradient
        colors={
          completed  ? ['#0A1F0A', '#081508'] :
          confirming ? ['#1A0F38', '#110A2E'] :
          isBonus    ? ['#1A0F2E', '#120A24'] :
                       ['#0F172A', '#1A2035']
        }
        style={[tc.card, completed && tc.cardDone, confirming && tc.cardConfirm]}
      >
        {confirming && (
          <View style={tc.confirmTrack}>
            <Animated.View style={[tc.confirmFill, { width: progressWidth }]} />
          </View>
        )}
        {isBonus && !completed && (
          <View style={tc.bonusBadge}><Text style={tc.bonusBadgeTxt}>⚡ BONUS</Text></View>
        )}
        <View style={tc.top}>
          <View style={[tc.iconBox, { backgroundColor: completed ? COLORS.success + '22' : color + '22' }]}>
            {completed
              ? <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
              : <Text style={{ fontSize: 20 }}>{task.emoji}</Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[tc.title, completed && tc.titleDone]} numberOfLines={2}>{task.title}</Text>
            <Text style={tc.desc} numberOfLines={1}>{task.description}</Text>
            <View style={tc.metaRow}>
              <View style={[tc.xpPill, { backgroundColor: color + '20' }]}>
                <Text style={[tc.xpTxt, { color }]}>+{task.xpReward} XP</Text>
              </View>
              <Text style={tc.dur}>⏱ {task.durationMinutes}m</Text>
              <View style={[tc.catPill, { backgroundColor: color + '15' }]}>
                <Text style={[tc.catTxt, { color }]}>{task.category}</Text>
              </View>
            </View>
          </View>
        </View>

        {!completed && (
          <View style={tc.actionRow}>
            {confirming ? (
              <>
                <TouchableOpacity style={tc.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
                  <Ionicons name="close" size={14} color={COLORS.textMuted} />
                  <Text style={tc.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[tc.confirmBtn, { backgroundColor: COLORS.success }]}
                  onPress={handlePress} activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={17} color="#fff" />
                  <Text style={tc.confirmTxt}>Yes, Done! ({countdown})</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[tc.doneBtn, { borderColor: color, backgroundColor: color + '15' }]}
                onPress={handlePress} activeOpacity={0.8} disabled={loading}
              >
                {loading
                  ? <ActivityIndicator size="small" color={color} />
                  : <><Ionicons name="checkmark-outline" size={15} color={color} /><Text style={[tc.doneTxt, { color }]}>Mark as Done</Text></>
                }
              </TouchableOpacity>
            )}
          </View>
        )}
        {completed && (
          <View style={tc.doneStrip}>
            <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
            <Text style={tc.doneStripTxt}>Completed · +{task.xpReward} XP earned 🎉</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

// ── TasksScreen ───────────────────────────────────────────────────────────────
export default function TasksScreen({ navigation }: { navigation?: any }) {
  const { language }        = useUserStore();
  const { currentSnapshot } = useMoodStore();
  const { t }               = useTranslation();
  const score               = currentSnapshot?.score ?? 5;

  const [completedIds,  setCompletedIds]  = useState<Set<string>>(new Set());
  const [bonusTasks,    setBonusTasks]    = useState<DailyTask[]>([]);
  const [bonusPage,     setBonusPage]     = useState(0);
  const [wantBonus,     setWantBonus]     = useState(false);
  const [stats,         setStats]         = useState({ xp: 0, level: 'Naya Bro', streak: 0 });
  const [todayXp,       setTodayXp]       = useState(0);
  const [calendar,      setCalendar]      = useState<boolean[]>([]);
  const [xpPopup,       setXpPopup]       = useState<{ xp: number; visible: boolean }>({ xp: 0, visible: false });
  const [levelUp,       setLevelUp]       = useState<string | null>(null);

  const xpAnim   = useRef(new Animated.Value(0)).current;
  const lvlAnim  = useRef(new Animated.Value(0)).current;
  const prevLvl  = useRef('');

  const baseTasks   = getAvailableTasks(score);
  const allBaseDone = baseTasks.length > 0 && baseTasks.every(task => completedIds.has(task.id));
  const doneCount   = baseTasks.filter(task => completedIds.has(task.id)).length;

  const loadData = useCallback(async () => {
    try {
      const [ids, st, txp, cal] = await Promise.all([
        getCompletedTaskIds(),
        getUserStats(),
        getTodayXP(),
        getStreakCalendar(),
      ]);
      const idSet = new Set(ids);
      setCompletedIds(idSet);
      setTodayXp(txp);
      setCalendar(cal);
      if (st) {
        const newLvl = st.current_level;
        if (prevLvl.current && prevLvl.current !== newLvl) {
          setLevelUp(newLvl);
          Animated.spring(lvlAnim, { toValue: 1, useNativeDriver: true }).start();
          setTimeout(() => {
            Animated.timing(lvlAnim, { toValue: 0, duration: 350, useNativeDriver: true })
              .start(() => setLevelUp(null));
          }, 3200);
        }
        prevLvl.current = newLvl;
        setStats({ xp: st.total_xp, level: newLvl, streak: st.streak_days });
      }
      if (baseTasks.length > 0 && baseTasks.every(task => idSet.has(task.id)) && wantBonus) {
        setBonusTasks(prev => prev.length > 0 ? prev : getNextBonusTasks(idSet, 4));
      }
    } catch (e) { console.warn('TasksScreen loadData:', e); }
  }, [score, wantBonus]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  useEffect(() => { loadData(); }, []);

  const handleComplete = async (task: DailyTask) => {
    if (completedIds.has(task.id)) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await markTaskCompleted(task.id, task.xpReward);

      // Animated XP popup
      setXpPopup({ xp: task.xpReward, visible: true });
      xpAnim.setValue(0);
      Animated.sequence([
        Animated.spring(xpAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }),
        Animated.delay(1400),
        Animated.timing(xpAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setXpPopup(p => ({ ...p, visible: false })));

      await loadData();
    } catch (e) { console.warn('complete error:', e); }
  };

  const loadMoreBonus = () => {
    const seen = new Set([...completedIds, ...bonusTasks.map(task => task.id)]);
    setBonusTasks(getNextBonusTasks(seen, 4));
    setBonusPage(p => p + 1);
  };

  const handleWantBonus = () => {
    setWantBonus(true);
    const seen = new Set(completedIds);
    setBonusTasks(getNextBonusTasks(seen, 4));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const nav = (screen: string) => { try { navigation?.navigate(screen); } catch {} };

  const todayXpDisplay = todayXp;

  return (
    <View style={s.root}>
      <LinearGradient colors={['#080B14', '#0A0F20']} style={StyleSheet.absoluteFillObject} />

      {/* XP popup — inlined, no separate component */}
      {xpPopup.visible && (
        <Animated.View style={[s.xpPop, {
          opacity: xpAnim,
          transform: [{ translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }]}>
          <Text style={s.xpPopCoin}>🪙</Text>
          <Text style={s.xpPopTxt}>+{xpPopup.xp} XP</Text>
          <Text style={s.xpPopStar}>✨</Text>
        </Animated.View>
      )}

      {/* Level-up banner */}
      {levelUp && (
        <Animated.View style={[s.lvlBanner, {
          opacity: lvlAnim,
          transform: [{ scale: lvlAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
        }]}>
          <Text style={{ fontSize: 30 }}>🎊</Text>
          <View>
            <Text style={s.lvlTitle}>Level Up! 🎉</Text>
            <Text style={s.lvlSub}>{levelUp}</Text>
          </View>
        </Animated.View>
      )}

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{t('tasks.title')}</Text>
              <Text style={s.sub}>
                {doneCount}/{baseTasks.length} {t('tasks.done_today')} · {t('tasks.keep_going')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => nav('Emergency')} style={s.sosBtn}>
              <Ionicons name="call" size={14} color={COLORS.danger} />
              <Text style={s.sosTxt}>SOS</Text>
            </TouchableOpacity>
          </View>

          {/* XP Card */}
          <XPCard
            xp={stats.xp}
            streak={stats.streak}
            todayXp={todayXpDisplay}
            calendar={calendar}
          />

          {/* Daily progress */}
          <View style={s.progressCard}>
            <View style={s.progressTop}>
              <Text style={s.progressLabel}>{t('tasks.progress')}</Text>
              <Text style={s.progressFrac}>{doneCount}/{baseTasks.length}</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, {
                width: `${baseTasks.length > 0 ? (doneCount / baseTasks.length) * 100 : 0}%` as any,
              }]} />
            </View>
            <View style={s.dotRow}>
              {baseTasks.map(task => (
                <View key={task.id} style={[s.dot, completedIds.has(task.id) && s.dotDone]} />
              ))}
            </View>
          </View>

          {/* Base tasks */}
          <Text style={s.sectionLabel}>{t('tasks.base_label')}</Text>
          {baseTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              completed={completedIds.has(task.id)}
              onComplete={handleComplete}
            />
          ))}

          {/* All done banner */}
          {allBaseDone && (
            <View style={s.allDone}>
              <Text style={{ fontSize: 32 }}>🎉</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.allDoneTitle}>
                  {t('tasks.all_done_title')}
                </Text>
                <Text style={s.allDoneSub}>
                  {t('tasks.all_done_sub', { xp: todayXpDisplay })}
                </Text>
              </View>
            </View>
          )}

          {/* ── BONUS TASKS SECTION ── */}
          {allBaseDone && !wantBonus && (
            <TouchableOpacity style={s.wantBonusBtn} onPress={handleWantBonus} activeOpacity={0.85}>
              <LinearGradient colors={['#1E1B4B', '#312E81']} style={s.wantBonusGrad}>
                <Text style={{ fontSize: 24 }}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.wantBonusTitle}>
                    {t('tasks.want_bonus')}
                  </Text>
                  <Text style={s.wantBonusSub}>
                    {t('tasks.bonus_subtitle')}
                  </Text>
                </View>
                <View style={s.wantBonusArrow}>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {allBaseDone && wantBonus && (
            <>
              <View style={s.bonusHeader}>
                <View>
                  <Text style={s.bonusTitle}>⚡ BONUS CHALLENGES</Text>
                  <Text style={s.bonusSub}>{t('tasks.bonus_sub')}</Text>
                </View>
                <TouchableOpacity style={s.refreshBtn} onPress={loadMoreBonus}>
                  <Ionicons name="refresh" size={13} color={COLORS.primary} />
                  <Text style={s.refreshTxt}>{t('tasks.new_set')}</Text>
                </TouchableOpacity>
              </View>

              {bonusTasks.map(task => (
                <TaskCard
                  key={task.id + bonusPage}
                  task={task}
                  completed={completedIds.has(task.id)}
                  isBonus
                  onComplete={handleComplete}
                />
              ))}

              <TouchableOpacity style={s.moreBtn} onPress={loadMoreBonus}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                <Text style={s.moreTxt}>
                  {t('tasks.load_more')}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>

      <EmergencyButton onPress={() => nav('Emergency')} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 18, paddingTop: 14 },

  xpPop:    {
    position: 'absolute', top: 90, alignSelf: 'center', zIndex: 999,
    backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: RADIUS.full, flexDirection: 'row', alignItems: 'center', gap: 6,
    shadowColor: '#4F46E5', shadowOpacity: 0.9, shadowRadius: 20, elevation: 12,
  },
  xpPopCoin: { fontSize: 18 },
  xpPopTxt:  { color: '#fff', fontWeight: '900', fontSize: 18 },
  xpPopStar: { fontSize: 16 },
  lvlBanner: {
    position: 'absolute', top: '38%', alignSelf: 'center', zIndex: 998,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#4F46E5', borderRadius: RADIUS.xl,
    paddingHorizontal: 24, paddingVertical: 18,
    shadowColor: '#4F46E5', shadowOpacity: 0.8, shadowRadius: 30,
  },
  lvlTitle: { fontSize: 17, fontWeight: '900', color: '#fff' },
  lvlSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  header:  { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 12 },
  title:   { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary },
  sub:     { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  sosBtn:  {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.danger + '60', backgroundColor: COLORS.danger + '12',
  },
  sosTxt: { fontSize: 12, fontWeight: '800', color: COLORS.danger },

  progressCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  progressTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel:{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: COLORS.textMuted, textTransform: 'uppercase' },
  progressFrac: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  progressTrack:{ height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 4 },
  dotRow:       { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border },
  dotDone:      { backgroundColor: COLORS.success },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 10,
  },

  allDone: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.success + '15', borderRadius: RADIUS.xl,
    padding: 18, marginVertical: 12, borderWidth: 1, borderColor: COLORS.success + '35',
  },
  allDoneTitle: { fontSize: 16, fontWeight: '800', color: COLORS.success },
  allDoneSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },

  wantBonusBtn: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 14 },
  wantBonusGrad:{
    padding: 18, borderRadius: RADIUS.xl, flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)',
  },
  wantBonusTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  wantBonusSub:   { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  wantBonusArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center',
  },

  bonusHeader:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, marginTop: 4,
  },
  bonusTitle: { fontSize: 12, fontWeight: '800', color: '#A78BFA', letterSpacing: 1 },
  bonusSub:   { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.primary + '50', backgroundColor: COLORS.primary + '12',
  },
  refreshTxt: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  moreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, backgroundColor: COLORS.primary + '12', borderRadius: RADIUS.xl,
    marginTop: 8, borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  moreTxt: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});

const xpS = StyleSheet.create({
  card:       { marginBottom: 16, borderRadius: RADIUS.xl, overflow: 'hidden' },
  grad:       { padding: 20, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  glowOrb:    { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(99,102,241,0.08)' },
  badgeRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge:      { alignSelf: 'flex-start', backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  badgeTxt:   { fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  streakBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.warning + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  streakBadgeTxt: { fontSize: 10, fontWeight: '800', color: COLORS.warning },
  levelName:  { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  xpRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  xpCount:    { fontSize: 12, color: COLORS.textMuted },
  todayPill:  { backgroundColor: '#4F46E5' + '30', paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary + '40' },
  todayTxt:   { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  topRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  emojiCircle:{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', justifyContent: 'center', alignItems: 'center' },
  barTrack:   { height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'visible', position: 'relative' },
  barFill:    { height: '100%', borderRadius: 5, backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.8, shadowRadius: 6 },
  tick:       { position: 'absolute', top: -3, width: 2, height: 16, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 1 },
  barLabel:   { fontSize: 10, color: COLORS.textMuted },
  divider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 12 },
  calTitle:   { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 8 },
});

const cal = StyleSheet.create({
  row:     { flexDirection: 'row', justifyContent: 'space-between' },
  cell:    { alignItems: 'center', gap: 4 },
  dot:     {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  dotDone:  { backgroundColor: COLORS.success + '30', borderColor: COLORS.success + '60' },
  dotToday: { borderColor: COLORS.primary, borderWidth: 2 },
  label:    { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
});

const tc = StyleSheet.create({
  card:        { borderRadius: RADIUS.xl, padding: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cardDone:    { borderColor: COLORS.success + '30', opacity: 0.75 },
  cardConfirm: { borderColor: '#7C3AED', borderWidth: 2 },
  confirmTrack:{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.05)' },
  confirmFill: { height: '100%', backgroundColor: COLORS.success + 'CC', borderRadius: 2 },
  bonusBadge:  { alignSelf: 'flex-start', backgroundColor: '#7C3AED22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, marginBottom: 8 },
  bonusBadgeTxt:{ fontSize: 9, fontWeight: '800', color: '#A78BFA', letterSpacing: 1 },
  top:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox:     { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title:       { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  titleDone:   { textDecorationLine: 'line-through', color: COLORS.textMuted },
  desc:        { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  xpPill:      { paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full },
  xpTxt:       { fontSize: 10, fontWeight: '800' },
  dur:         { fontSize: 10, color: COLORS.textMuted },
  catPill:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full },
  catTxt:      { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  actionRow:   { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  doneBtn:     {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: RADIUS.lg, borderWidth: 1.5,
  },
  doneTxt:     { fontSize: 13, fontWeight: '700' },
  confirmBtn:  {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: RADIUS.lg,
  },
  confirmTxt:  { fontSize: 13, fontWeight: '800', color: '#fff' },
  cancelBtn:   {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelTxt:   { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  doneStrip:   {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.success + '25',
  },
  doneStripTxt: { fontSize: 11, color: COLORS.success, fontWeight: '600' },
});