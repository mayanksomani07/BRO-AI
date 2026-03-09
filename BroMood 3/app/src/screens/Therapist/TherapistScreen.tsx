import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS } from '../../constants/theme';
import { useUserStore } from '../../store/userStore';

type Specialty = 'all' | 'anxiety' | 'depression' | 'relationships' | 'career' | 'grief';
type Mode = 'all' | 'online' | 'offline' | 'free';

interface Therapist {
  id: string;
  name: string;
  qualification: string;
  specialties: Specialty[];
  languages: string[];
  fee: string;
  mode: ('online' | 'offline')[];
  rating: number;
  reviews: number;
  availability: string;
  location?: string;
  bookingUrl: string;
  avatar: string;
  isFree?: boolean;
}

const THERAPISTS: Therapist[] = [
  {
    id: 't1', name: 'Dr. Priya Sharma', qualification: 'Ph.D Clinical Psychology',
    specialties: ['anxiety', 'depression', 'relationships'],
    languages: ['Hindi', 'English', 'Punjabi'],
    fee: '₹800/session', mode: ['online', 'offline'], rating: 4.9, reviews: 142,
    availability: 'Mon–Sat, 10am–7pm', location: 'Delhi / Online',
    bookingUrl: 'https://www.practo.com', avatar: '👩‍⚕️',
  },
  {
    id: 't2', name: 'Rahul Mehta', qualification: 'M.Sc Psychology, CBT Certified',
    specialties: ['career', 'anxiety', 'grief'],
    languages: ['Hindi', 'English', 'Marathi'],
    fee: '₹600/session', mode: ['online'], rating: 4.8, reviews: 89,
    availability: 'Tue–Sun, 6pm–10pm', location: 'Online Only',
    bookingUrl: 'https://www.practo.com', avatar: '👨‍⚕️',
  },
  {
    id: 't3', name: 'iCall – Free Counselling', qualification: 'TISS-trained counsellors',
    specialties: ['anxiety', 'depression', 'relationships', 'grief', 'career'],
    languages: ['Hindi', 'English', 'Tamil', 'Bengali', 'Marathi', 'Kannada'],
    fee: 'FREE', mode: ['online'], rating: 4.7, reviews: 500,
    availability: 'Mon–Sat, 8am–10pm',
    bookingUrl: 'https://icallhelpline.org', avatar: '🏥', isFree: true,
  },
  {
    id: 't4', name: 'Dr. Ananya Krishnan', qualification: 'MBBS, DPM Psychiatry',
    specialties: ['depression', 'anxiety'],
    languages: ['English', 'Tamil', 'Kannada'],
    fee: '₹1200/session', mode: ['online', 'offline'], rating: 4.9, reviews: 203,
    availability: 'Mon, Wed, Fri, 4pm–8pm', location: 'Bengaluru / Online',
    bookingUrl: 'https://www.practo.com', avatar: '👩‍⚕️',
  },
  {
    id: 't5', name: 'Vandrevala Foundation', qualification: 'Professional helpline team',
    specialties: ['anxiety', 'depression', 'grief'],
    languages: ['Hindi', 'English', 'Marathi', 'Gujarati'],
    fee: 'FREE', mode: ['online'], rating: 4.6, reviews: 300,
    availability: '24/7',
    bookingUrl: 'https://www.vandrevalafoundation.com', avatar: '💛', isFree: true,
  },
  {
    id: 't6', name: 'Amit Desai', qualification: 'M.A. Psychology, NLP Practitioner',
    specialties: ['career', 'relationships', 'anxiety'],
    languages: ['Hindi', 'English', 'Gujarati'],
    fee: '₹500/session', mode: ['online'], rating: 4.7, reviews: 66,
    availability: 'Daily, 9am–1pm',
    bookingUrl: 'https://www.practo.com', avatar: '👨‍⚕️',
  },
];

const SPECIALTY_FILTERS: { key: Specialty; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '🌟' },
  { key: 'anxiety', label: 'Anxiety', emoji: '😰' },
  { key: 'depression', label: 'Depression', emoji: '💙' },
  { key: 'relationships', label: 'Relationships', emoji: '💔' },
  { key: 'career', label: 'Career', emoji: '💼' },
  { key: 'grief', label: 'Grief', emoji: '🕊️' },
];

const MODE_FILTERS: { key: Mode; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'online', label: 'Online' },
  { key: 'offline', label: 'In-person' },
  { key: 'free', label: 'Free' },
];

export default function TherapistScreen() {
  const navigation = useNavigation<any>();
  const { language } = useUserStore();
  const [specialty, setSpecialty] = useState<Specialty>('all');
  const [mode, setMode] = useState<Mode>('all');
  const [search, setSearch] = useState('');

  const filtered = THERAPISTS.filter(t => {
    const matchesSpecialty = specialty === 'all' || t.specialties.includes(specialty);
    const matchesMode = mode === 'all'
      ? true
      : mode === 'free'
      ? t.isFree
      : t.mode.includes(mode as 'online' | 'offline');
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
      || t.languages.some(l => l.toLowerCase().includes(search.toLowerCase()));
    return matchesSpecialty && matchesMode && matchesSearch;
  });

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
            {language === 'english' ? 'Find a Therapist' : 'Therapist Dhundho'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={language === 'english' ? 'Search by name or language...' : 'Naam ya language se dhundho...'}
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {/* Specialty filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {SPECIALTY_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, specialty === f.key && styles.filterChipActive]}
              onPress={() => setSpecialty(f.key)}
            >
              <Text style={styles.filterEmoji}>{f.emoji}</Text>
              <Text style={[styles.filterLabel, specialty === f.key && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Mode filters */}
        <View style={styles.modeFilters}>
          {MODE_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.modeChip, mode === f.key && styles.modeChipActive]}
              onPress={() => setMode(f.key)}
            >
              <Text style={[styles.modeLabel, mode === f.key && styles.modeLabelActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Results count */}
        <Text style={styles.resultsCount}>
          {filtered.length} {language === 'english' ? 'therapists found' : 'therapist mile'}
        </Text>

        {/* Therapist cards */}
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {filtered.map(t => (
            <TherapistCard key={t.id} therapist={t} language={language} />
          ))}
          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>
                {language === 'english' ? 'No results. Try different filters.' : 'Koi nahi mila. Filters badlo.'}
              </Text>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function TherapistCard({ therapist: t, language }: { therapist: Therapist; language: string }) {
  return (
    <View style={styles.card}>
      <LinearGradient colors={[COLORS.card, COLORS.surfaceElevated]} style={styles.cardGrad}>
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={styles.avatarWrap}>
            <Text style={{ fontSize: 32 }}>{t.avatar}</Text>
          </View>
          <View style={styles.cardMeta}>
            <View style={styles.nameRow}>
              <Text style={styles.therapistName}>{t.name}</Text>
              {t.isFree && (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>FREE</Text>
                </View>
              )}
            </View>
            <Text style={styles.qualification}>{t.qualification}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingText}>{t.rating}</Text>
              <Text style={styles.reviewText}>({t.reviews} reviews)</Text>
            </View>
          </View>
        </View>

        {/* Specialties */}
        <View style={styles.specialtyList}>
          {t.specialties.slice(0, 4).map(s => (
            <View key={s} style={styles.specialtyChip}>
              <Text style={styles.specialtyText}>{s}</Text>
            </View>
          ))}
        </View>

        {/* Details grid */}
        <View style={styles.detailsGrid}>
          <DetailItem icon="language" label={t.languages.slice(0, 3).join(', ')} />
          <DetailItem icon="videocam" label={t.mode.join(' + ')} />
          <DetailItem icon="cash" label={t.fee} color={t.isFree ? COLORS.success : undefined} />
          <DetailItem icon="time" label={t.availability} />
          {t.location && <DetailItem icon="location" label={t.location} />}
        </View>

        {/* Book button */}
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => Linking.openURL(t.bookingUrl)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={t.isFree ? [COLORS.success, '#1AAD82'] : [COLORS.primary, COLORS.primaryDark]}
            style={styles.bookBtnGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Ionicons name="calendar" size={16} color="#fff" />
            <Text style={styles.bookBtnText}>
              {t.isFree
                ? (language === 'english' ? 'Contact Free' : 'Free Mein Connect Karo')
                : (language === 'english' ? 'Book Session' : 'Session Book Karo')}
            </Text>
            <Ionicons name="open-outline" size={14} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

function DetailItem({ icon, label, color }: { icon: string; label: string; color?: string }) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon as any} size={13} color={color ?? COLORS.textMuted} />
      <Text style={[styles.detailText, color ? { color } : {}]} numberOfLines={1}>
        {label}
      </Text>
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

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginTop: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  filterScroll: { paddingLeft: 16, paddingVertical: 10 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary },
  filterEmoji: { fontSize: 14 },
  filterLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterLabelActive: { color: COLORS.primary },

  modeFilters: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  modeChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  modeChipActive: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary },
  modeLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  modeLabelActive: { color: COLORS.primary },

  resultsCount: {
    fontSize: 12, color: COLORS.textMuted, paddingHorizontal: 20, marginBottom: 8,
  },

  list: { paddingHorizontal: 16, paddingTop: 4 },
  card: { marginBottom: 12, borderRadius: RADIUS['2xl'], overflow: 'hidden' },
  cardGrad: { padding: 16, borderRadius: RADIUS['2xl'], borderWidth: 1, borderColor: COLORS.border },

  cardTop: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  avatarWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  cardMeta: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  therapistName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  freeBadge: {
    backgroundColor: COLORS.success + '25', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.success + '50',
  },
  freeBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.success },
  qualification: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },
  reviewText: { fontSize: 11, color: COLORS.textMuted },

  specialtyList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  specialtyChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: COLORS.primary + '15', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  specialtyText: { fontSize: 11, fontWeight: '600', color: COLORS.primary, textTransform: 'capitalize' },

  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: '45%', maxWidth: '55%' },
  detailText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },

  bookBtn: { borderRadius: RADIUS.xl, overflow: 'hidden' },
  bookBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center', paddingVertical: 13, borderRadius: RADIUS.xl,
  },
  bookBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  emptyState: { flex: 1, alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});
