import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, FadeIn } from 'react-native-reanimated';
import { useLanguage } from '@/lib/language-context';
import { getDailyTasks, getCompletedTasks, markTaskCompleted, getTotalXP, getLevel, CATEGORY_COLORS, type ConfidenceTask } from '@/lib/confidence-tasks';
import colors from '@/constants/colors';

const HELPLINES = [
  { name: 'iCall', number: '9152987821', description: 'Psychosocial Helpline (Mon-Sat, 8am-10pm)' },
  { name: 'Vandrevala Foundation', number: '18602662345', description: '24/7 Mental Health Support' },
  { name: 'AASRA', number: '9820466726', description: '24/7 Crisis Intervention' },
  { name: 'Snehi', number: '04424640050', description: 'Emotional Support (24/7)' },
];

const THERAPIST_PLATFORMS = [
  { name: 'Practo', url: 'https://www.practo.com/therapists', icon: 'medical', color: '#EF4444' },
  { name: 'Amaha', url: 'https://www.amahahealth.com', icon: 'heart', color: '#8B5CF6' },
  { name: 'YourDOST', url: 'https://yourdost.com', icon: 'people', color: '#3B82F6' },
  { name: 'BetterHelp India', url: 'https://www.betterhelp.com', icon: 'globe', color: '#10B981' },
];

const RELAXING_SOUNDS = [
  { id: 'rain', name: 'Rain', icon: 'rainy', color: '#3B82F6' },
  { id: 'ocean', name: 'Ocean Waves', icon: 'water', color: '#06B6D4' },
  { id: 'birds', name: 'Birds', icon: 'leaf', color: '#10B981' },
  { id: 'wind', name: 'Wind', icon: 'cloud', color: '#8B5CF6' },
];

function TaskCard({ task, completed, onComplete }: { task: ConfidenceTask; completed: boolean; onComplete: () => void }) {
  const scale = useSharedValue(1);
  const catColor = CATEGORY_COLORS[task.category] || colors.primary;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => {
          if (!completed) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            scale.value = withSequence(withSpring(1.05), withSpring(1));
            onComplete();
          }
        }}
        style={[styles.taskCard, completed && styles.taskCardCompleted]}
      >
        <View style={[styles.taskIconContainer, { backgroundColor: catColor + '15' }]}>
          <Ionicons name={task.icon as any} size={22} color={catColor} />
        </View>
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, completed && styles.taskTitleCompleted]}>{task.title}</Text>
          <Text style={styles.taskDescription} numberOfLines={2}>{task.description}</Text>
          <View style={styles.taskMeta}>
            <View style={styles.taskMetaItem}>
              <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
              <Text style={styles.taskMetaText}>{task.duration}</Text>
            </View>
            <View style={styles.taskMetaItem}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.taskMetaText}>+{task.xp} XP</Text>
            </View>
          </View>
        </View>
        {completed ? (
          <View style={styles.taskDone}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
          </View>
        ) : (
          <View style={[styles.taskDoBtn, { borderColor: catColor }]}>
            <Text style={[styles.taskDoBtnText, { color: catColor }]}>Do it</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const [tasks, setTasks] = useState<ConfidenceTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [xp, setXp] = useState(0);
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [section, setSection] = useState<'tasks' | 'music' | 'helpline' | 'therapist'>('tasks');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    const loadData = async () => {
      setTasks(getDailyTasks(language));
      const completed = await getCompletedTasks();
      setCompletedTasks(completed);
      const totalXp = await getTotalXP();
      setXp(totalXp);
    };
    loadData();
  }, [language]);

  const handleCompleteTask = useCallback(async (task: ConfidenceTask) => {
    const newXp = await markTaskCompleted(task.id, task.xp);
    setXp(newXp);
    setCompletedTasks(prev => ({ ...prev, [task.id]: true }));
  }, []);

  const toggleSound = useCallback((soundId: string) => {
    if (playingSound === soundId) {
      setPlayingSound(null);
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlayingSound(soundId);

    const urls: Record<string, string> = {
      rain: 'https://www.youtube.com/results?search_query=rain+sounds+relaxing',
      ocean: 'https://www.youtube.com/results?search_query=ocean+waves+relaxing',
      birds: 'https://www.youtube.com/results?search_query=bird+sounds+nature+relaxing',
      wind: 'https://www.youtube.com/results?search_query=wind+sounds+ambient+relaxing',
    };

    Linking.openURL(urls[soundId] || urls.rain).catch(() => {
      Alert.alert('Relaxing Sounds', 'Search for ambient sounds on YouTube or Spotify for the best experience.');
    });
    setPlayingSound(null);
  }, [playingSound]);

  const handleCall = useCallback((number: string) => {
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Call', `Please dial ${number}`, [{ text: 'OK' }]);
    });
  }, []);

  const levelInfo = getLevel(xp);

  const sectionButtons = [
    { id: 'tasks' as const, icon: 'trophy', label: 'Tasks' },
    { id: 'music' as const, icon: 'musical-notes', label: 'Relax' },
    { id: 'helpline' as const, icon: 'call', label: 'Helpline' },
    { id: 'therapist' as const, icon: 'medkit', label: 'Therapy' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <View style={styles.xpBadge}>
          <Ionicons name="star" size={14} color="#F59E0B" />
          <Text style={styles.xpText}>{xp} XP</Text>
        </View>
      </View>

      <View style={styles.sectionNav}>
        {sectionButtons.map((btn) => (
          <Pressable
            key={btn.id}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSection(btn.id);
            }}
            style={[styles.sectionBtn, section === btn.id && styles.sectionBtnActive]}
          >
            <Ionicons
              name={btn.icon as any}
              size={18}
              color={section === btn.id ? '#FFFFFF' : colors.textSecondary}
            />
            <Text style={[styles.sectionBtnText, section === btn.id && styles.sectionBtnTextActive]}>
              {btn.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }]}
      >
        {section === 'tasks' && (
          <>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.levelCard}
            >
              <View style={styles.levelInfo}>
                <Text style={styles.levelLabel}>Level {levelInfo.level}</Text>
                <Text style={styles.levelTitle}>{levelInfo.title}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${levelInfo.progress * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {xp} / {levelInfo.nextLevelXp} XP to next level
              </Text>
            </LinearGradient>

            <Text style={styles.sectionTitle}>Today's Challenges</Text>
            <View style={styles.tasksList}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  completed={!!completedTasks[task.id]}
                  onComplete={() => handleCompleteTask(task)}
                />
              ))}
            </View>
          </>
        )}

        {section === 'music' && (
          <>
            <Text style={styles.sectionTitle}>Relaxing Sounds</Text>
            <Text style={styles.sectionDescription}>
              {language === 'hinglish'
                ? 'Apne mann ko shaant karne ke liye ambient sounds sun'
                : 'Listen to ambient sounds to calm your mind'}
            </Text>
            <View style={styles.soundGrid}>
              {RELAXING_SOUNDS.map((sound) => (
                <Pressable
                  key={sound.id}
                  onPress={() => toggleSound(sound.id)}
                  style={({ pressed }) => [
                    styles.soundCard,
                    playingSound === sound.id && styles.soundCardPlaying,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View style={[styles.soundIcon, { backgroundColor: sound.color + '15' }]}>
                    <Ionicons
                      name={sound.icon as any}
                      size={28}
                      color={sound.color}
                    />
                  </View>
                  <Text style={styles.soundName}>{sound.name}</Text>
                  {playingSound === sound.id && (
                    <Ionicons name="volume-high" size={16} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              {language === 'hinglish' ? 'Quick Relaxation Tips' : 'Quick Relaxation Tips'}
            </Text>
            {[
              { icon: 'leaf', title: language === 'hinglish' ? '4-7-8 Breathing' : '4-7-8 Breathing', desc: language === 'hinglish' ? '4 sec inhale, 7 sec hold, 8 sec exhale — 3 rounds' : '4 sec inhale, 7 sec hold, 8 sec exhale — 3 rounds' },
              { icon: 'eye', title: language === 'hinglish' ? '5-4-3-2-1 Grounding' : '5-4-3-2-1 Grounding', desc: language === 'hinglish' ? '5 cheezein dekh, 4 chhu, 3 sun, 2 soongh, 1 chakho' : '5 things see, 4 touch, 3 hear, 2 smell, 1 taste' },
              { icon: 'body', title: language === 'hinglish' ? 'Body Scan' : 'Body Scan', desc: language === 'hinglish' ? 'Pair se sar tak — har body part ko feel kar aur relax karo' : 'From feet to head — feel and relax each body part' },
            ].map((tip, i) => (
              <View key={i} style={styles.tipCard}>
                <View style={[styles.tipIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={tip.icon as any} size={20} color={colors.primary} />
                </View>
                <View style={styles.tipContent}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Text style={styles.tipDesc}>{tip.desc}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {section === 'helpline' && (
          <>
            <LinearGradient
              colors={['#EF4444', '#B91C1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emergencyBanner}
            >
              <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
              <View style={styles.emergencyContent}>
                <Text style={styles.emergencyTitle}>
                  {language === 'hinglish' ? 'Emergency? Abhi call karo' : 'Emergency? Call now'}
                </Text>
                <Text style={styles.emergencySubtitle}>
                  {language === 'hinglish'
                    ? 'Professional help 24/7 available hai'
                    : 'Professional help is available 24/7'}
                </Text>
              </View>
            </LinearGradient>

            <Text style={styles.sectionTitle}>
              {language === 'hinglish' ? 'Mental Health Helplines' : 'Mental Health Helplines'}
            </Text>
            {HELPLINES.map((helpline, i) => (
              <Pressable
                key={i}
                onPress={() => handleCall(helpline.number)}
                style={({ pressed }) => [styles.helplineCard, { opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={styles.helplineIcon}>
                  <Ionicons name="call" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.helplineContent}>
                  <Text style={styles.helplineName}>{helpline.name}</Text>
                  <Text style={styles.helplineNumber}>{helpline.number}</Text>
                  <Text style={styles.helplineDesc}>{helpline.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Pressable>
            ))}
          </>
        )}

        {section === 'therapist' && (
          <>
            <Text style={styles.sectionTitle}>
              {language === 'hinglish' ? 'Professional Help Lein' : 'Get Professional Help'}
            </Text>
            <Text style={styles.sectionDescription}>
              {language === 'hinglish'
                ? 'Online therapy platforms jahan se aap licensed therapist se baat kar sakte ho'
                : 'Online therapy platforms where you can talk to licensed therapists'}
            </Text>
            {THERAPIST_PLATFORMS.map((platform, i) => (
              <Pressable
                key={i}
                onPress={() => Linking.openURL(platform.url)}
                style={({ pressed }) => [styles.therapistCard, { opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={[styles.therapistIcon, { backgroundColor: platform.color + '15' }]}>
                  <Ionicons name={platform.icon as any} size={22} color={platform.color} />
                </View>
                <View style={styles.therapistContent}>
                  <Text style={styles.therapistName}>{platform.name}</Text>
                  <Text style={styles.therapistUrl}>{platform.url.replace('https://', '').replace('www.', '')}</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
              </Pressable>
            ))}

            <View style={styles.disclaimerCard}>
              <Ionicons name="information-circle" size={18} color={colors.textSecondary} />
              <Text style={styles.disclaimerText}>
                {language === 'hinglish'
                  ? 'MoodGuard ek wellness app hai, therapy ka replacement nahi. Professional help zaroor lein agar zaroorat ho.'
                  : 'MoodGuard is a wellness app, not a replacement for therapy. Please seek professional help when needed.'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  xpText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#92400E',
  },
  sectionNav: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 8,
  },
  sectionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sectionBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  sectionBtnTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  levelCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  levelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  levelTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardCompleted: {
    opacity: 0.7,
  },
  taskIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  taskDescription: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskMetaText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
  },
  taskDoBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  taskDoBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  taskDone: {},
  soundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  soundCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  soundCardPlaying: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  soundIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  tipDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  emergencyBanner: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  emergencySubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 10,
  },
  helplineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helplineContent: {
    flex: 1,
  },
  helplineName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  helplineNumber: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.primary,
    marginTop: 2,
  },
  helplineDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  therapistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 10,
  },
  therapistIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  therapistContent: {
    flex: 1,
  },
  therapistName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  therapistUrl: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
