import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS, getMoodColor } from '../../constants/theme';
import { useMoodStore } from '../../store/moodStore';
import { useUserStore } from '../../store/userStore';

const PLAYLISTS = [
  {
    id: '1', title: 'Calm & Heal', emoji: '🌊', moodRange: [1, 4],
    desc: 'Soothing sounds for tough moments', color: '#60A5FA', tracks: 18,
    spotifyUrl: 'https://open.spotify.com/search/calm%20indian%20instrumental',
  },
  {
    id: '2', title: 'Lo-fi Dost', emoji: '🎵', moodRange: [3, 7],
    desc: 'Indian lo-fi for late nights', color: '#A78BFA', tracks: 24,
    spotifyUrl: 'https://open.spotify.com/search/indian%20lofi',
  },
  {
    id: '3', title: 'Mood Lift', emoji: '🌤️', moodRange: [1, 10],
    desc: 'Upbeat songs to shift your energy', color: '#34D399', tracks: 15,
    spotifyUrl: 'https://open.spotify.com/search/feel%20good%20bollywood',
  },
  {
    id: '4', title: 'Bollywood Feels', emoji: '🎬', moodRange: [1, 10],
    desc: 'Classic Bollywood for every emotion', color: '#F59E0B', tracks: 30,
    spotifyUrl: 'https://open.spotify.com/search/emotional%20bollywood',
  },
  {
    id: '5', title: 'Sleep Well', emoji: '🌙', moodRange: [1, 5],
    desc: '30-min sleep stories + soft music', color: '#8B5CF6', tracks: 10,
    spotifyUrl: 'https://open.spotify.com/search/sleep%20meditation%20hindi',
  },
  {
    id: '6', title: 'Workout Bro', emoji: '💪', moodRange: [6, 10],
    desc: 'High energy to burn it out', color: '#F87171', tracks: 22,
    spotifyUrl: 'https://open.spotify.com/search/indian%20workout%20playlist',
  },
  {
    id: '7', title: 'Sufi Soul', emoji: '🕊️', moodRange: [1, 10],
    desc: 'Healing Sufi music for the soul', color: '#FBBF24', tracks: 16,
    spotifyUrl: 'https://open.spotify.com/search/sufi%20music%20healing',
  },
  {
    id: '8', title: 'Coding Flow', emoji: '💻', moodRange: [5, 10],
    desc: 'Focus beats for deep work', color: '#6EE7B7', tracks: 20,
    spotifyUrl: 'https://open.spotify.com/search/coding%20focus%20beats',
  },
];

const BREATHING_EXERCISES = [
  { id: 'b1', name: 'Box Breathing', desc: '4-4-4-4 pattern. Resets your nervous system.', duration: '4 min', emoji: '📦' },
  { id: 'b2', name: '4-7-8 Breath', desc: 'Inhale 4, hold 7, exhale 8. Sleep aid.', duration: '5 min', emoji: '😴' },
  { id: 'b3', name: 'Wim Hof Light', desc: '30 deep breaths + breath hold.', duration: '8 min', emoji: '🌬️' },
];

export default function MusicScreen() {
  const navigation = useNavigation<any>();
  const { currentSnapshot } = useMoodStore();
  const { language } = useUserStore();
  const score = currentSnapshot?.score ?? 5;
  const [activeTab, setActiveTab] = useState<'music' | 'breathe'>('music');

  const recommended = PLAYLISTS.filter(
    p => score >= p.moodRange[0] && score <= p.moodRange[1]
  );
  const all = PLAYLISTS;

  const openPlaylist = (url: string) => Linking.openURL(url);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#080B14', '#0A0F20']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'english' ? 'Music & Breathe' : 'Music & Breathe'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tab Selector */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'music' && styles.tabActive]}
            onPress={() => setActiveTab('music')}
          >
            <Text style={[styles.tabText, activeTab === 'music' && styles.tabTextActive]}>
              🎵 {language === 'english' ? 'Music' : 'Music'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'breathe' && styles.tabActive]}
            onPress={() => setActiveTab('breathe')}
          >
            <Text style={[styles.tabText, activeTab === 'breathe' && styles.tabTextActive]}>
              🌬️ {language === 'english' ? 'Breathe' : 'Breathe'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'music' ? (
            <>
              {/* Mood-recommended section */}
              {recommended.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>
                    {language === 'english' ? '⭐ RECOMMENDED FOR YOU' : '⭐ TERE LIYE RECOMMENDED'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    {recommended.map(p => (
                      <PlaylistCard key={p.id} playlist={p} onPress={() => openPlaylist(p.spotifyUrl)} featured />
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={styles.sectionLabel}>
                {language === 'english' ? 'ALL PLAYLISTS' : 'SABHI PLAYLISTS'}
              </Text>
              {all.map(p => (
                <PlaylistRow key={p.id} playlist={p} onPress={() => openPlaylist(p.spotifyUrl)} />
              ))}
            </>
          ) : (
            <>
              <View style={styles.breatheHero}>
                <Text style={styles.breatheHeroEmoji}>🫁</Text>
                <Text style={styles.breatheHeroTitle}>
                  {language === 'english' ? 'Breathing Exercises' : 'Breathing Exercises'}
                </Text>
                <Text style={styles.breatheHeroSub}>
                  {language === 'english'
                    ? 'Proven techniques to calm your nervous system in minutes.'
                    : 'Kuch minutes mein nervous system calm karne ke tarike.'}
                </Text>
              </View>
              {BREATHING_EXERCISES.map(ex => (
                <BreathingCard key={ex.id} exercise={ex} language={language} />
              ))}
            </>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function PlaylistCard({ playlist: p, onPress, featured }: {
  playlist: typeof PLAYLISTS[0]; onPress: () => void; featured?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.playlistCard, featured && styles.playlistCardFeatured]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[p.color + '30', p.color + '10']}
        style={styles.playlistCardGrad}
      >
        <Text style={styles.playlistEmoji}>{p.emoji}</Text>
        <Text style={styles.playlistName}>{p.title}</Text>
        <Text style={styles.playlistDesc} numberOfLines={2}>{p.desc}</Text>
        <View style={styles.playlistMeta}>
          <Text style={[styles.playlistTracks, { color: p.color }]}>{p.tracks} tracks</Text>
          <Ionicons name="play-circle" size={28} color={p.color} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function PlaylistRow({ playlist: p, onPress }: {
  playlist: typeof PLAYLISTS[0]; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.playlistRow} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={[COLORS.card, COLORS.surfaceElevated]} style={styles.playlistRowGrad}>
        <View style={[styles.playlistRowIcon, { backgroundColor: p.color + '25' }]}>
          <Text style={{ fontSize: 24 }}>{p.emoji}</Text>
        </View>
        <View style={styles.playlistRowBody}>
          <Text style={styles.playlistRowName}>{p.title}</Text>
          <Text style={styles.playlistRowDesc}>{p.desc}</Text>
        </View>
        <View style={styles.playlistRowRight}>
          <Text style={[styles.playlistRowTracks, { color: p.color }]}>{p.tracks}</Text>
          <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function BreathingCard({ exercise: ex, language }: {
  exercise: typeof BREATHING_EXERCISES[0]; language: string;
}) {
  const [active, setActive] = useState(false);
  return (
    <View style={styles.breathCard}>
      <LinearGradient colors={[COLORS.card, COLORS.surfaceElevated]} style={styles.breathCardGrad}>
        <View style={styles.breathCardHeader}>
          <Text style={styles.breathEmoji}>{ex.emoji}</Text>
          <View style={styles.breathInfo}>
            <Text style={styles.breathName}>{ex.name}</Text>
            <Text style={styles.breathDesc}>{ex.desc}</Text>
          </View>
          <View style={styles.breathRight}>
            <Text style={styles.breathDuration}>{ex.duration}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.breathStartBtn, active && styles.breathStopBtn]}
          onPress={() => setActive(!active)}
          activeOpacity={0.8}
        >
          <Ionicons name={active ? 'stop-circle' : 'play-circle'} size={18} color="#fff" />
          <Text style={styles.breathStartText}>
            {active
              ? (language === 'english' ? 'Stop' : 'Roko')
              : (language === 'english' ? 'Start' : 'Shuru karo')}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

  tabs: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  tabActive: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },

  content: { padding: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 12, marginTop: 8,
  },
  horizontalScroll: { marginHorizontal: -16, paddingLeft: 16, marginBottom: 20 },

  playlistCard: { width: 170, marginRight: 12, borderRadius: RADIUS.xl, overflow: 'hidden' },
  playlistCardFeatured: {},
  playlistCardGrad: {
    padding: 16, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, minHeight: 160,
  },
  playlistEmoji: { fontSize: 32, marginBottom: 10 },
  playlistName: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  playlistDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 12 },
  playlistMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  playlistTracks: { fontSize: 12, fontWeight: '700' },

  playlistRow: { marginBottom: 8, borderRadius: RADIUS.xl, overflow: 'hidden' },
  playlistRowGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
  },
  playlistRowIcon: {
    width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  playlistRowBody: { flex: 1 },
  playlistRowName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  playlistRowDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  playlistRowRight: { alignItems: 'flex-end', gap: 4 },
  playlistRowTracks: { fontSize: 12, fontWeight: '700' },

  breatheHero: { alignItems: 'center', marginBottom: 24, paddingVertical: 8 },
  breatheHeroEmoji: { fontSize: 48, marginBottom: 10 },
  breatheHeroTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  breatheHeroSub: {
    fontSize: 14, color: COLORS.textSecondary, textAlign: 'center',
    lineHeight: 21, marginTop: 6, paddingHorizontal: 20,
  },

  breathCard: { marginBottom: 10, borderRadius: RADIUS.xl, overflow: 'hidden' },
  breathCardGrad: {
    padding: 16, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  breathCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  breathEmoji: { fontSize: 28, marginTop: 2 },
  breathInfo: { flex: 1 },
  breathName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  breathDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3, lineHeight: 18 },
  breathRight: {},
  breathDuration: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  breathStartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start',
  },
  breathStopBtn: { backgroundColor: COLORS.danger },
  breathStartText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
