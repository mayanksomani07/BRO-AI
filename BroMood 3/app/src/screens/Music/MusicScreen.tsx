/**
 * MusicScreen — Ambient audio player + Guided breathing
 * Audio: SomaFM free internet radio (no account needed, legal, free)
 * Breathing: expo-speech voice guidance + animated circle
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../store/userStore';
import { COLORS, RADIUS } from '../../constants/theme';

// ─── Tracks — SomaFM free radio (legal, no-login internet radio) ───────────────
interface Track {
  id: string; title: string; subtitle: string;
  emoji: string; color: string; streamUrl: string; genre: string;
}

const TRACKS: Track[] = [
  { id: 'drone',  title: 'Calm & Heal',    subtitle: 'Deep drones for stress relief',    emoji: '🌌', color: '#60A5FA', genre: 'Ambient',   streamUrl: 'https://ice2.somafm.com/dronezone-128-mp3' },
  { id: 'groove', title: 'Lo-fi Dost',     subtitle: 'Chilled beats for late nights',    emoji: '🎵', color: '#A78BFA', genre: 'Lo-fi',     streamUrl: 'https://ice2.somafm.com/groovesalad-128-mp3' },
  { id: 'space',  title: 'Space Mind',     subtitle: 'Cosmic ambient for focus & calm',  emoji: '🚀', color: '#34D399', genre: 'Space',     streamUrl: 'https://ice2.somafm.com/spacestation-128-mp3' },
  { id: 'cliq',   title: 'Coding Flow',    subtitle: 'Electronic beats for deep work',   emoji: '💻', color: '#6EE7B7', genre: 'Electronic',streamUrl: 'https://ice2.somafm.com/cliqhop-128-mp3' },
  { id: 'folk',   title: 'Sufi Soul',      subtitle: 'Acoustic folk for the weary soul', emoji: '🕊️', color: '#FBBF24', genre: 'Folk',      streamUrl: 'https://ice2.somafm.com/folkfwd-128-mp3' },
  { id: 'indie',  title: 'Mood Lift',      subtitle: 'Upbeat indie to shift your energy',emoji: '🌤️', color: '#F87171', genre: 'Indie',     streamUrl: 'https://ice2.somafm.com/indiepop-128-mp3' },
  { id: 'metal',  title: 'Release It',     subtitle: 'Heavy cathartic music for anger',  emoji: '🤘', color: '#FF4757', genre: 'Metal',     streamUrl: 'https://ice2.somafm.com/metal-128-mp3' },
  { id: 'jazz',   title: 'Late Night Jazz',subtitle: 'Smooth jazz for slow evenings',    emoji: '🎷', color: '#F59E0B', genre: 'Jazz',      streamUrl: 'https://ice2.somafm.com/lush-128-mp3' },
];

// ─── Breathing exercises ────────────────────────────────────────────────────────
interface BreathEx {
  id: string; name: string; desc: string; emoji: string; color: string;
  inhale: number; hold: number; exhale: number; holdOut: number; rounds: number;
}
const BREATH_EX: BreathEx[] = [
  { id: 'box',   name: 'Box Breathing',  desc: 'Balances nervous system. Used by Navy SEALs.',     emoji: '📦', color: '#60A5FA', inhale: 4, hold: 4, exhale: 4,  holdOut: 4, rounds: 4 },
  { id: '478',   name: '4-7-8 Breath',   desc: 'Best for anxiety & sleep. Dr. Weil technique.',    emoji: '😴', color: '#A78BFA', inhale: 4, hold: 7, exhale: 8,  holdOut: 0, rounds: 4 },
  { id: 'belly', name: 'Belly Breathing',desc: 'Activates parasympathetic (calm) nervous system.',  emoji: '🌬️', color: '#34D399', inhale: 5, hold: 2, exhale: 6,  holdOut: 0, rounds: 5 },
];

type Phase = 'inhale' | 'hold' | 'exhale' | 'hold_out';

export default function MusicScreen() {
  const { language } = useUserStore();
  const { t } = useTranslation();

  // ── Audio state ───────────────────────────────────────────────────────────────
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // ── Breathing state ───────────────────────────────────────────────────────────
  const [activeEx, setActiveEx] = useState<BreathEx | null>(null);
  const [phase, setPhase] = useState<Phase>('inhale');
  const [countdown, setCountdown] = useState(0);
  const [round, setRound] = useState(1);
  const breathAnim = useRef(new Animated.Value(0.35)).current;
  const breathAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('inhale');
  const countRef = useRef(0);
  const roundRef = useRef(1);
  const exRef = useRef<BreathEx | null>(null);

  const PHASE_COLOR: Record<Phase, string> = {
    inhale: '#60A5FA', hold: '#FBBF24', exhale: '#34D399', hold_out: '#F472B6',
  };

  useEffect(() => {
    // Configure audio session once on mount
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
    return () => {
      soundRef.current?.unloadAsync();
      if (timerRef.current) clearInterval(timerRef.current);
      Speech.stop();
    };
  }, []);

  // ── Audio controls ─────────────────────────────────────────────────────────────
  const playTrack = async (track: Track) => {
    setAudioError(null);
    setLoadingId(track.id);

    // Stop existing sound
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }

    // Toggle off if same track
    if (currentTrack?.id === track.id && isPlaying) {
      setCurrentTrack(null);
      setIsPlaying(false);
      setLoadingId(null);
      return;
    }

    try {
      const { sound, status } = await Audio.Sound.createAsync(
        { uri: track.streamUrl },
        { shouldPlay: true, isLooping: false, volume: 0.75 },
        (s) => { if (!s.isLoaded) { setIsPlaying(false); } }
      );
      soundRef.current = sound;
      setCurrentTrack(track);
      setIsPlaying(true);
    } catch (err: any) {
      setAudioError(t('music.audio_error'));
      setCurrentTrack(track);
      setIsPlaying(false);
    } finally {
      setLoadingId(null);
    }
  };

  const togglePause = async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const stopAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setAudioError(null);
  };

  // ── Breathing engine ──────────────────────────────────────────────────────────
  const getDuration = (ex: BreathEx, p: Phase): number => {
    const map: Record<Phase, number> = { inhale: ex.inhale, hold: ex.hold, exhale: ex.exhale, hold_out: ex.holdOut };
    return map[p];
  };

  const getNextPhase = (ex: BreathEx, p: Phase): Phase | null => {
    if (p === 'inhale') return ex.hold > 0 ? 'hold' : 'exhale';
    if (p === 'hold') return 'exhale';
    if (p === 'exhale') return ex.holdOut > 0 ? 'hold_out' : null; // null = next round or done
    return null;
  };

  const speakPhase = (p: Phase, _lang: string) => {
    Speech.stop();
    const phaseKey: Record<Phase, string> = {
      inhale:   t('music.breathe_in'),
      hold:     t('music.hold'),
      exhale:   t('music.breathe_out'),
      hold_out: t('music.hold_out'),
    };
    Speech.speak(phaseKey[p], { language: 'en-US', rate: 0.85, pitch: 0.9 });
  };

  const animateCircle = (p: Phase, durationSec: number) => {
    breathAnimRef.current?.stop();
    breathAnimRef.current = Animated.timing(breathAnim, {
      toValue: p === 'inhale' ? 1 : p === 'exhale' ? 0.35 : breathAnim.__getValue(),
      duration: durationSec * 1000,
      useNativeDriver: false,
    });
    breathAnimRef.current.start();
  };

  const startPhase = (ex: BreathEx, p: Phase, r: number) => {
    const dur = getDuration(ex, p);
    if (dur === 0) {
      // Skip phases with 0 duration
      const next = getNextPhase(ex, p);
      if (next) { startPhase(ex, next, r); }
      else { advanceRound(ex, r); }
      return;
    }

    phaseRef.current = p;
    countRef.current = dur;
    roundRef.current = r;
    setPhase(p);
    setCountdown(dur);
    setRound(r);
    speakPhase(p, language);
    animateCircle(p, dur);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      countRef.current -= 1;
      setCountdown(countRef.current);
      if (countRef.current <= 0) {
        clearInterval(timerRef.current!);
        const next = getNextPhase(ex, phaseRef.current);
        if (next) {
          startPhase(ex, next, roundRef.current);
        } else {
          advanceRound(ex, roundRef.current);
        }
      }
    }, 1000);
  };

  const advanceRound = (ex: BreathEx, r: number) => {
    if (r >= ex.rounds) {
      // Done!
      Speech.speak(t('music.complete'), { rate: 0.85 });
      setTimeout(() => {
        setActiveEx(null);
        Animated.timing(breathAnim, { toValue: 0.35, duration: 600, useNativeDriver: false }).start();
      }, 1500);
      return;
    }
    // Short pause between rounds
    setTimeout(() => startPhase(ex, 'inhale', r + 1), 800);
  };

  const startBreathing = (ex: BreathEx) => {
    exRef.current = ex;
    setActiveEx(ex);
    startPhase(ex, 'inhale', 1);
  };

  const stopBreathing = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    breathAnimRef.current?.stop();
    Speech.stop();
    setActiveEx(null);
    Animated.timing(breathAnim, { toValue: 0.35, duration: 500, useNativeDriver: false }).start();
  };

  const phaseColor = PHASE_COLOR[phase];

  return (
    <View style={s.root}>
      <LinearGradient colors={[COLORS.background, '#0A0E1F']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          <Text style={s.headerTitle}>{t('music.title')}</Text>

          {/* Now playing bar */}
          {currentTrack && (
            <View style={[s.nowPlaying, { borderColor: currentTrack.color + '50' }]}>
              <Text style={{ fontSize: 24 }}>{currentTrack.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.npTitle}>{currentTrack.title}</Text>
                <Text style={[s.npSub, { color: isPlaying ? currentTrack.color : COLORS.textMuted }]}>
                  {isPlaying ? '▶ Live streaming' : '⏸ Paused'}
                </Text>
                {audioError && <Text style={s.npError}>⚠ {audioError}</Text>}
              </View>
              <TouchableOpacity style={[s.npBtn, { backgroundColor: currentTrack.color }]} onPress={togglePause}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[s.npBtn, { backgroundColor: COLORS.surface }]} onPress={stopAudio}>
                <Ionicons name="stop" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Ambient tracks */}
          <Text style={s.sectionLabel}>{t('music.ambient')}</Text>
          <Text style={s.sectionSub}>{t('music.ambient_sub')}</Text>

          <View style={s.trackGrid}>
            {TRACKS.map(track => {
              const isActive = currentTrack?.id === track.id;
              const isLoading = loadingId === track.id;
              return (
                <TouchableOpacity
                  key={track.id}
                  style={[s.trackCard, isActive && { borderColor: track.color, borderWidth: 1.5 }]}
                  onPress={() => playTrack(track)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isActive ? [track.color + '22', track.color + '08'] : [COLORS.card, COLORS.surface]}
                    style={s.trackGrad}
                  >
                    <Text style={s.trackEmoji}>{track.emoji}</Text>
                    <Text style={s.trackTitle}>{track.title}</Text>
                    <Text style={s.trackSub} numberOfLines={2}>{track.subtitle}</Text>
                    <View style={s.trackBottom}>
                      <View style={[s.genrePill, { backgroundColor: track.color + '25' }]}>
                        <Text style={[s.genreText, { color: track.color }]}>{track.genre}</Text>
                      </View>
                      {isLoading
                        ? <Ionicons name="hourglass" size={16} color={track.color} />
                        : isActive && isPlaying
                          ? <Ionicons name="volume-high" size={16} color={track.color} />
                          : <Ionicons name="play-circle" size={16} color={COLORS.textMuted} />
                      }
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Breathing section */}
          <Text style={[s.sectionLabel, { marginTop: 20 }]}>{t('music.breathing')}</Text>
          <Text style={s.sectionSub}>{t('music.breathing_sub')}</Text>

          {activeEx ? (
            <View style={s.breathPlayer}>
              <LinearGradient colors={['#060C1A', '#040810']} style={s.breathPlayerGrad}>
                <Text style={s.breathExName}>{activeEx.name}</Text>
                <Text style={s.breathRoundText}>
                  {t('music.round_of', { round, total: activeEx.rounds })}
                </Text>

                {/* Animated circle */}
                <View style={s.circleWrap}>
                  {/* Outer glow ring */}
                  <Animated.View style={[s.glowRing, {
                    width: breathAnim.interpolate({ inputRange: [0.35, 1], outputRange: [130, 230] }),
                    height: breathAnim.interpolate({ inputRange: [0.35, 1], outputRange: [130, 230] }),
                    borderRadius: breathAnim.interpolate({ inputRange: [0.35, 1], outputRange: [65, 115] }),
                    borderColor: phaseColor + '40',
                  }]} />
                  {/* Main circle */}
                  <Animated.View style={[s.breathCircle, {
                    width: breathAnim.interpolate({ inputRange: [0.35, 1], outputRange: [100, 180] }),
                    height: breathAnim.interpolate({ inputRange: [0.35, 1], outputRange: [100, 180] }),
                    borderRadius: breathAnim.interpolate({ inputRange: [0.35, 1], outputRange: [50, 90] }),
                    borderColor: phaseColor,
                    backgroundColor: phaseColor + '12',
                  }]}>
                    <Text style={[s.breathNum, { color: phaseColor }]}>{countdown}</Text>
                  </Animated.View>
                </View>

                <Text style={[s.phaseLabel, { color: phaseColor }]}>
                  {{
                    inhale:   t('music.breathe_in'),
                    hold:     t('music.hold'),
                    exhale:   t('music.breathe_out'),
                    hold_out: t('music.hold_out'),
                  }[phase]}
                </Text>
                <Text style={s.voiceNote}>{t('music.voice_on')}</Text>

                <TouchableOpacity style={s.stopBtn} onPress={stopBreathing}>
                  <Text style={s.stopBtnText}>{t('music.stop')}</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            BREATH_EX.map(ex => (
              <TouchableOpacity key={ex.id} style={s.breathCard} onPress={() => startBreathing(ex)} activeOpacity={0.8}>
                <LinearGradient colors={[COLORS.card, COLORS.surfaceElevated]} style={s.breathCardGrad}>
                  <View style={[s.breathIcon, { backgroundColor: ex.color + '20' }]}>
                    <Text style={{ fontSize: 26 }}>{ex.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.breathName}>{ex.name}</Text>
                    <Text style={s.breathDesc}>{ex.desc}</Text>
                    <View style={s.patternRow}>
                      {[
                        { label: t('music.in'), val: ex.inhale },
                        { label: t('music.hold_short'), val: ex.hold },
                        { label: t('music.out_label'), val: ex.exhale },
                        ...(ex.holdOut > 0 ? [{ label: t('music.hold_short'), val: ex.holdOut }] : []),
                      ].map((p, i) => (
                        <View key={i} style={[s.patChip, { backgroundColor: ex.color + '20' }]}>
                          <Text style={[s.patLabel, { color: ex.color }]}>{p.label}</Text>
                          <Text style={[s.patVal, { color: ex.color }]}>{p.val}s</Text>
                        </View>
                      ))}
                      <Text style={s.rounds}>× {ex.rounds}</Text>
                    </View>
                  </View>
                  <View style={[s.playBtn, { backgroundColor: ex.color }]}>
                    <Ionicons name="play" size={18} color="#fff" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  sectionSub: { fontSize: 12, color: COLORS.textSecondary + '90', marginBottom: 12 },

  nowPlaying: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 14, marginBottom: 16, borderWidth: 1 },
  npTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  npSub: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  npError: { fontSize: 11, color: COLORS.warning, marginTop: 2 },
  npBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  trackGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  trackCard: { width: '47.5%', borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  trackGrad: { padding: 14, borderRadius: RADIUS.xl, minHeight: 130 },
  trackEmoji: { fontSize: 26, marginBottom: 6 },
  trackTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  trackSub: { fontSize: 10, color: COLORS.textSecondary, lineHeight: 14, flex: 1, marginBottom: 8 },
  trackBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  genrePill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full },
  genreText: { fontSize: 9, fontWeight: '700' },

  breathPlayer: { borderRadius: RADIUS['2xl'], overflow: 'hidden', marginBottom: 12 },
  breathPlayerGrad: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20, borderRadius: RADIUS['2xl'], borderWidth: 1, borderColor: COLORS.border },
  breathExName: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  breathRoundText: { fontSize: 13, color: COLORS.textMuted, marginBottom: 28 },
  circleWrap: { width: 240, height: 240, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  glowRing: { position: 'absolute', borderWidth: 2 },
  breathCircle: { justifyContent: 'center', alignItems: 'center', borderWidth: 2.5 },
  breathNum: { fontSize: 40, fontWeight: '900' },
  phaseLabel: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  voiceNote: { fontSize: 12, color: COLORS.textMuted, marginBottom: 24 },
  stopBtn: { paddingHorizontal: 36, paddingVertical: 12, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  stopBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 14 },

  breathCard: { marginBottom: 10, borderRadius: RADIUS.xl, overflow: 'hidden' },
  breathCardGrad: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },
  breathIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  breathName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  breathDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 8 },
  patternRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  patChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.md, alignItems: 'center' },
  patLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  patVal: { fontSize: 13, fontWeight: '900' },
  rounds: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  playBtn: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
});
