/**
 * TherapistScreen v6
 *
 * iPhone-first redesign:
 * ─ Fixed ~110px: topbar + search+mode-toggles + specialty emoji chips
 * ─ Crisis banner scrolls with content (FlatList ListHeaderComponent)
 * ─ Compact cards (~160px) — 3+ visible at once on small iPhones
 * ─ No expand/collapse animation — always accessible, always clean
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, Linking, TextInput, Alert, Platform, Animated,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons }       from '@expo/vector-icons';
import { useNavigation }  from '@react-navigation/native';
import { COLORS, RADIUS } from '../../constants/theme';
import { useTranslation } from 'react-i18next';

type Specialty = 'all' | 'anxiety' | 'depression' | 'relationships' | 'career' | 'grief';
type Mode      = 'all' | 'online' | 'offline' | 'free';
type IonName   = keyof typeof Ionicons.glyphMap;

interface Therapist {
  id: string; name: string; qualification: string;
  specialties: Specialty[]; languages: string[];
  fee: string; mode: Array<'online' | 'offline'>;
  rating: number; reviews: number;
  availability: string; location?: string;
  bookingUrl: string;
  avatar: string; avatarBg: string;
  isFree?: boolean; phone?: string;
  tagline: string; accentColor: string;
}

const THERAPISTS: Therapist[] = [
  {
    id: 't1', name: 'Dr. Priya Sharma', qualification: 'Ph.D Clinical Psychology',
    specialties: ['anxiety', 'depression', 'relationships'],
    languages: ['Hindi', 'English', 'Punjabi'],
    fee: '₹800/session', mode: ['online', 'offline'], rating: 4.9, reviews: 142,
    availability: 'Mon–Sat, 10am–7pm', location: 'Delhi / Online',
    bookingUrl: 'https://www.practo.com/delhi/psychologist',
    avatar: '👩‍⚕️', avatarBg: '#A78BFA', accentColor: '#A78BFA',
    tagline: 'CBT · Mindfulness · Relationships',
  },
  {
    id: 't2', name: 'Rahul Mehta', qualification: 'M.Sc Psychology, CBT Certified',
    specialties: ['career', 'anxiety', 'grief'],
    languages: ['Hindi', 'English', 'Marathi'],
    fee: '₹600/session', mode: ['online'], rating: 4.8, reviews: 89,
    availability: 'Tue–Sun, 6pm–10pm', location: 'Online Only',
    bookingUrl: 'https://www.practo.com/mumbai/psychologist',
    avatar: '👨‍⚕️', avatarBg: '#60A5FA', accentColor: '#60A5FA',
    tagline: 'Career stress · Grief · CBT',
  },
  {
    id: 't3', name: 'iCall — Free Counselling', qualification: 'TISS-trained counsellors',
    specialties: ['anxiety', 'depression', 'relationships', 'grief', 'career'],
    languages: ['Hindi', 'English', 'Tamil', 'Bengali', 'Marathi', 'Kannada'],
    fee: 'FREE', mode: ['online'], rating: 4.7, reviews: 500,
    availability: 'Mon–Sat, 8am–10pm',
    bookingUrl: 'https://icallhelpline.org',
    phone: '9152987821', avatar: '🏥', avatarBg: '#34D399',
    accentColor: '#34D399', isFree: true,
    tagline: 'Free professional help · All languages',
  },
  {
    id: 't4', name: 'Dr. Ananya Krishnan', qualification: 'MBBS, DPM Psychiatry',
    specialties: ['depression', 'anxiety'],
    languages: ['English', 'Tamil', 'Kannada'],
    fee: '₹1200/session', mode: ['online', 'offline'], rating: 4.9, reviews: 203,
    availability: 'Mon, Wed, Fri · 4–8pm', location: 'Bengaluru / Online',
    bookingUrl: 'https://www.practo.com/bangalore/psychiatrist',
    avatar: '👩‍⚕️', avatarBg: '#F472B6', accentColor: '#F472B6',
    tagline: 'Psychiatry · Medication management',
  },
  {
    id: 't5', name: 'Vandrevala Foundation', qualification: 'Professional helpline',
    specialties: ['anxiety', 'depression', 'grief'],
    languages: ['Hindi', 'English', 'Marathi', 'Gujarati'],
    fee: 'FREE', mode: ['online'], rating: 4.6, reviews: 300,
    availability: '24 / 7',
    bookingUrl: 'https://www.vandrevalafoundation.com',
    phone: '18602662345', avatar: '💛', avatarBg: '#FBBF24',
    accentColor: '#FBBF24', isFree: true,
    tagline: '24/7 crisis & emotional support',
  },
  {
    id: 't6', name: 'Amit Desai', qualification: 'M.A. Psychology, NLP Practitioner',
    specialties: ['career', 'relationships', 'anxiety'],
    languages: ['Hindi', 'English', 'Gujarati'],
    fee: '₹500/session', mode: ['online'], rating: 4.7, reviews: 66,
    availability: 'Daily, 9am–1pm',
    bookingUrl: 'https://www.practo.com/ahmedabad/psychologist',
    avatar: '👨‍⚕️', avatarBg: '#F59E0B', accentColor: '#F59E0B',
    tagline: 'NLP · Career coaching · Anxiety',
  },
  {
    id: 't7', name: 'Snehi Helpline', qualification: 'Trained volunteer counsellors',
    specialties: ['depression', 'grief', 'anxiety'],
    languages: ['Hindi', 'English'],
    fee: 'FREE', mode: ['online'], rating: 4.5, reviews: 200,
    availability: '24 / 7',
    bookingUrl: 'https://www.snehi.org',
    phone: '04424640050', avatar: '🌸', avatarBg: '#F472B6',
    accentColor: '#EC4899', isFree: true,
    tagline: 'Emotional support · Always available',
  },
  {
    id: 't8', name: 'Dr. Kavita Rao', qualification: 'Ph.D Counselling Psychology',
    specialties: ['relationships', 'depression', 'grief'],
    languages: ['Kannada', 'English', 'Hindi'],
    fee: '₹900/session', mode: ['online', 'offline'], rating: 4.8, reviews: 118,
    availability: 'Mon–Fri, 11am–6pm', location: 'Bengaluru / Online',
    bookingUrl: 'https://www.practo.com/bangalore/psychologist',
    avatar: '👩‍⚕️', avatarBg: '#34D399', accentColor: '#10B981',
    tagline: 'Grief · Relationship therapy',
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────
const SPECS: Array<{ key: Specialty; label: string; emoji: string; color: string; icon: IonName }> = [
  { key: 'all',           label: 'All',      emoji: '✨', color: '#FFFFFF', icon: 'apps' },
  { key: 'anxiety',       label: 'Anxiety',  emoji: '🧠', color: '#A78BFA', icon: 'pulse' },
  { key: 'depression',    label: 'Low Mood', emoji: '💙', color: '#60A5FA', icon: 'heart' },
  { key: 'relationships', label: 'Bonds',    emoji: '💞', color: '#F472B6', icon: 'people' },
  { key: 'career',        label: 'Career',   emoji: '💼', color: '#FBBF24', icon: 'briefcase' },
  { key: 'grief',         label: 'Grief',    emoji: '🍃', color: '#34D399', icon: 'leaf' },
];

const MODE_CFG: Record<'online' | 'offline' | 'free', { icon: IonName; color: string }> = {
  online:  { icon: 'videocam',  color: '#60A5FA' },
  offline: { icon: 'business',  color: '#FBBF24' },
  free:    { icon: 'gift',      color: '#34D399' },
};

const SPEC_COLOR: Record<string, string> = {
  anxiety: '#A78BFA', depression: '#60A5FA', relationships: '#F472B6',
  career: '#FBBF24',  grief: '#34D399',
};
const SPEC_ICON: Record<string, IonName> = {
  anxiety: 'pulse', depression: 'heart', relationships: 'people',
  career: 'briefcase', grief: 'leaf',
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function TherapistScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();

  const [specialty, setSpecialty] = useState<Specialty>('all');
  const [mode,      setMode]      = useState<Mode>('all');
  const [search,    setSearch]    = useState('');

  const filtered = THERAPISTS.filter(th => {
    const okSpec   = specialty === 'all' || th.specialties.includes(specialty);
    const okMode   = mode === 'all'  ? true
                   : mode === 'free' ? !!th.isFree
                   : th.mode.includes(mode as 'online' | 'offline');
    const q        = search.toLowerCase();
    const okSearch = !q
      || th.name.toLowerCase().includes(q)
      || th.languages.some(l => l.toLowerCase().includes(q))
      || th.specialties.some(sp => sp.includes(q));
    return okSpec && okMode && okSearch;
  });

  const toggleMode = (mk: 'online' | 'offline' | 'free') =>
    setMode(prev => prev === mk ? 'all' : mk);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#060912', '#080D1A']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* ── TopBar ────────────────────────────────────────────── */}
        <View style={s.topBar}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => { try { nav.goBack(); } catch {} }}
            activeOpacity={0.75}
          >
            <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Find Support</Text>
            <Text style={s.subtitle}>Real help · Real humans</Text>
          </View>
          <View style={s.countPill}>
            <Text style={s.countNum}>{filtered.length}</Text>
            <Text style={s.countLbl}> found</Text>
          </View>
        </View>

        {/* ── Search + mode icon toggles ─────────────────────────── */}
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={15} color={COLORS.textMuted} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Name, language, concern…"
              placeholderTextColor={COLORS.textMuted}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={15} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          {/* 3 compact icon toggles: online / in-person / free */}
          
          <View style={s.modeGroup}>
            {(['online', 'offline', 'free'] as const).map(mk => {
              const cfg    = MODE_CFG[mk];
              const active = mode === mk;
              return (
                <TouchableOpacity
                  key={mk}
                  style={[s.modeBtn, active && { backgroundColor: cfg.color + '22', borderColor: cfg.color + '66' }]}
                  onPress={() => toggleMode(mk)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={cfg.icon} size={14} color={active ? cfg.color : COLORS.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Specialty emoji chip strip ─────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipStrip}
          style={s.chipScroll}
        >
          {SPECS.map(sp => {
            const active = specialty === sp.key;
            return (
              <TouchableOpacity
                key={sp.key}
                style={[s.chip, active && { backgroundColor: sp.color + '1C', borderColor: sp.color + '55' }]}
                onPress={() => setSpecialty(sp.key)}
                activeOpacity={0.75}
              >
                <Text style={s.chipEmoji}>{sp.emoji}</Text>
                <Text style={[s.chipLabel, active && { color: sp.color, fontWeight: '800' }]}>{sp.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Card list; crisis banner scrolls as header ─────────── */}
        <FlatList<Therapist>
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TherapistCard th={item} />}
          ListHeaderComponent={<CrisisBanner />}
          ListEmptyComponent={<EmptyState />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />

      </SafeAreaView>
    </View>
  );
}

// ─── Crisis Banner ─────────────────────────────────────────────────────────────
function CrisisBanner() {
  return (
    <TouchableOpacity
      style={s.crisis}
      onPress={() => Linking.openURL('tel:9152987821')}
      activeOpacity={0.82}
    >
      <LinearGradient colors={['#FF475718', '#FF000008']} style={s.crisisGrad}>
        <View style={s.crisisIcon}>
          <Ionicons name="call" size={14} color="#FF4757" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.crisisTitle}>In crisis right now?</Text>
          <Text style={s.crisisSub}>iCall · 9152987821 · Free · Mon–Sat 8am–10pm</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color="#FF4757" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={s.empty}>
      <Text style={s.emptyEmoji}>🔍</Text>
      <Text style={s.emptyTitle}>No results</Text>
      <Text style={s.emptySub}>Try a different filter or search term</Text>
    </View>
  );
}

// ─── TherapistCard (compact) ──────────────────────────────────────────────────
function TherapistCard({ th }: { th: Therapist }) {
  const scale    = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.977, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,     useNativeDriver: true }).start();

  const openBooking = () => {
    Linking.openURL(th.bookingUrl).catch(() => {
      Alert.alert('Could not open', th.phone ? `Call: ${th.phone}` : 'Please try again.', [
        { text: 'OK', style: 'cancel' },
        ...(th.phone
          ? [{ text: 'Call', onPress: () => Linking.openURL(`tel:${th.phone!.replace(/\D/g, '')}`) }]
          : []),
      ]);
    });
  };

  const callNow = () => {
    if (!th.phone) return;
    Linking.openURL(`tel:${th.phone.replace(/\D/g, '')}`).catch(() => Alert.alert('', `Dial: ${th.phone}`));
  };

  // Compact labels
  const modeStr = th.mode.length === 2 ? 'Online + Local' : th.mode[0] === 'online' ? 'Online' : 'In-person';
  const langStr = th.languages[0] + (th.languages.length > 1 ? ` +${th.languages.length - 1}` : '');

  return (
    <Animated.View style={[c.card, { transform: [{ scale }] }]}>
      {/* Colored accent top bar — gives each card a unique visual stamp */}
      <View style={[c.accentBar, { backgroundColor: th.accentColor }]} />

      <LinearGradient colors={['#0F1828', '#090E1A']} style={c.inner}>

        {/* ── Identity ─────────────────────────────────────────── */}
        <View style={c.identityRow}>
          <View style={[c.avatar, { backgroundColor: th.accentColor + '1E' }]}>
            <Text style={c.avatarEmoji}>{th.avatar}</Text>
            {th.isFree && (
              <View style={c.freeBadge}><Text style={c.freeBadgeText}>FREE</Text></View>
            )}
          </View>

          <View style={c.nameCol}>
            <Text style={c.name} numberOfLines={1}>{th.name}</Text>
            <Text style={c.qual} numberOfLines={1}>{th.qualification}</Text>
            <Text style={[c.tagline, { color: th.accentColor }]} numberOfLines={1}>{th.tagline}</Text>
          </View>

          <View style={[c.ratingPill, { backgroundColor: th.accentColor + '18' }]}>
            <Ionicons name="star" size={9} color="#FBBF24" />
            <Text style={c.ratingText}>{th.rating}</Text>
          </View>
        </View>

        {/* ── Info strip: fee · mode · language ────────────────── */}
        <View style={c.infoStrip}>
          <Ionicons name="cash-outline" size={10} color={th.isFree ? COLORS.success : COLORS.textMuted} />
          <Text style={[c.infoVal, th.isFree && { color: COLORS.success, fontWeight: '800' }]}>{th.fee}</Text>
          <View style={c.dot} />
          <Ionicons name="videocam-outline" size={10} color={COLORS.textMuted} />
          <Text style={c.infoVal}>{modeStr}</Text>
          <View style={c.dot} />
          <Ionicons name="language-outline" size={10} color={COLORS.textMuted} />
          <Text style={c.infoVal}>{langStr}</Text>
        </View>

        {/* ── Specialty tags (max 3) ────────────────────────────── */}
        <View style={c.specRow}>
          {th.specialties.slice(0, 3).map(sp => (
            <View key={sp} style={[c.specTag, {
              backgroundColor: (SPEC_COLOR[sp] ?? '#fff') + '12',
              borderColor:     (SPEC_COLOR[sp] ?? '#fff') + '28',
            }]}>
              <Ionicons name={SPEC_ICON[sp] ?? 'ellipse'} size={8} color={SPEC_COLOR[sp] ?? '#fff'} />
              <Text style={[c.specText, { color: SPEC_COLOR[sp] ?? '#fff' }]}>{sp}</Text>
            </View>
          ))}
        </View>

        <View style={c.divider} />

        {/* ── Actions ──────────────────────────────────────────── */}
        <View style={c.actions}>
          {th.phone && (
            <TouchableOpacity
              style={c.callBtn}
              onPress={callNow}
              onPressIn={pressIn} onPressOut={pressOut}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={13} color="#fff" />
              <Text style={c.callText}>Call Free</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              c.bookBtn,
              th.phone ? { flex: 1 } : {},
              { borderColor: th.isFree ? COLORS.success + '55' : COLORS.primary + '55' },
            ]}
            onPress={openBooking}
            onPressIn={pressIn} onPressOut={pressOut}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={th.isFree
                ? [COLORS.success + '22', COLORS.success + '08']
                : [COLORS.primary + '22', COLORS.primary + '08']}
              style={c.bookGrad}
            >
              <Ionicons
                name={th.isFree ? 'link' : 'calendar'}
                size={13}
                color={th.isFree ? COLORS.success : COLORS.primary}
              />
              <Text style={[c.bookText, { color: th.isFree ? COLORS.success : COLORS.primary }]}>
                {th.isFree ? 'Visit Website' : 'Book on Practo'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </LinearGradient>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060912' },
  safe: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 10,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#ffffff0E', justifyContent: 'center', alignItems: 'center',
  },
  title:    { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  countPill: {
    flexDirection: 'row', alignItems: 'baseline',
    backgroundColor: '#ffffff0A', paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
  },
  countNum: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  countLbl: { fontSize: 10, color: COLORS.textSecondary },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 8, gap: 7,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111828', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 11, paddingVertical: Platform.OS === 'ios' ? 10 : 6, gap: 7,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  modeGroup:   { flexDirection: 'row', gap: 5 },
  modeBtn: {
    width: 34, height: 34, borderRadius: RADIUS.md,
    backgroundColor: '#0F1520', borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },

  chipScroll: { flexGrow: 0, marginBottom: 8 },
  chipStrip:  { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: RADIUS.full, backgroundColor: '#0F1520',
    borderWidth: 1, borderColor: COLORS.border,
  },

  chipEmoji: { fontSize: 15 },
  chipLabel: { fontSize: 13, fontWeight: '700', color: '#C8D1E0' },

  crisis: { marginBottom: 10, borderRadius: RADIUS.lg, overflow: 'hidden' },
  crisisGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: '#FF475730', borderRadius: RADIUS.lg,
  },
  crisisIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FF475720', justifyContent: 'center', alignItems: 'center',
  },
  crisisTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  crisisSub:   { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },

  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  emptySub:   { fontSize: 13, color: COLORS.textSecondary },
});

const c = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  accentBar: { height: 3 },
  inner: {},

  identityRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 13, paddingBottom: 8, gap: 10,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  avatarEmoji: { fontSize: 22 },
  freeBadge: {
    position: 'absolute', bottom: -3, right: -8,
    backgroundColor: COLORS.success, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  freeBadgeText: { fontSize: 7, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  nameCol: { flex: 1 },
  name:    { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  qual:    { fontSize: 10, color: COLORS.textSecondary, marginBottom: 2 },
  tagline: { fontSize: 10, fontStyle: 'italic' },

  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 4,
    borderRadius: RADIUS.lg, alignSelf: 'flex-start',
  },
  ratingText: { fontSize: 12, fontWeight: '800', color: '#FBBF24' },

  infoStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 13, paddingBottom: 8, gap: 5, flexWrap: 'nowrap',
  },
  infoVal: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#ffffff20' },

  specRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    paddingHorizontal: 13, paddingBottom: 10,
  },
  specTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  specText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },

  divider: { height: 1, backgroundColor: '#ffffff08', marginHorizontal: 13, marginBottom: 11 },

  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 13, paddingBottom: 13 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.success, paddingHorizontal: 13, paddingVertical: 10,
    borderRadius: RADIUS.lg,
  },
  callText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  bookBtn:  { borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1.5 },
  bookGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 10,
  },
  bookText: { fontSize: 11, fontWeight: '800' },
});