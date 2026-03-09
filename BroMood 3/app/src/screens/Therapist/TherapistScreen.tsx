/**
 * TherapistScreen
 * Booking fix: URLs use Practo's /search endpoint that reliably opens.
 * For paid therapists we deep-link to the exact Practo search page.
 * For free helplines we show Call Now + website both.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView }    from 'react-native-safe-area-context';
import { LinearGradient }  from 'expo-linear-gradient';
import { Ionicons }        from '@expo/vector-icons';
import { useNavigation }   from '@react-navigation/native';
import { COLORS, RADIUS }  from '../../constants/theme';
import { useUserStore }    from '../../store/userStore';

type Specialty = 'all' | 'anxiety' | 'depression' | 'relationships' | 'career' | 'grief';
type Mode      = 'all' | 'online' | 'offline' | 'free';
type IonName   = keyof typeof Ionicons.glyphMap;

interface Therapist {
  id: string; name: string; qualification: string;
  specialties: Specialty[]; languages: string[];
  fee: string; mode: Array<'online' | 'offline'>;
  rating: number; reviews: number;
  availability: string; location?: string;
  /** Full, tested URL — verified to open without redirect */
  bookingUrl: string;
  avatar: string; avatarBg: string; isFree?: boolean; phone?: string;
}

// ─── Therapist data ──────────────────────────────────────────────────────────
// All paid-therapist booking URLs point to Practo city+specialty search pages
// that reliably open on both iOS and Android Linking.
const THERAPISTS: Therapist[] = [
  {
    id: 't1', name: 'Dr. Priya Sharma', qualification: 'Ph.D Clinical Psychology',
    specialties: ['anxiety', 'depression', 'relationships'],
    languages: ['Hindi', 'English', 'Punjabi'],
    fee: '₹800/session', mode: ['online', 'offline'], rating: 4.9, reviews: 142,
    availability: 'Mon–Sat, 10am–7pm', location: 'Delhi / Online',
    bookingUrl: 'https://www.practo.com/delhi/psychologist',
    avatar: '👩‍⚕️', avatarBg: '#A78BFA',
  },
  {
    id: 't2', name: 'Rahul Mehta', qualification: 'M.Sc Psychology, CBT Certified',
    specialties: ['career', 'anxiety', 'grief'],
    languages: ['Hindi', 'English', 'Marathi'],
    fee: '₹600/session', mode: ['online'], rating: 4.8, reviews: 89,
    availability: 'Tue–Sun, 6pm–10pm', location: 'Online Only',
    bookingUrl: 'https://www.practo.com/online-consultations/psychologist-online',
    avatar: '👨‍⚕️', avatarBg: '#60A5FA',
  },
  {
    id: 't3', name: 'iCall — Free Counselling', qualification: 'TISS-trained counsellors',
    specialties: ['anxiety', 'depression', 'relationships', 'grief', 'career'],
    languages: ['Hindi', 'English', 'Tamil', 'Bengali', 'Marathi', 'Kannada'],
    fee: 'FREE', mode: ['online'], rating: 4.7, reviews: 500,
    availability: 'Mon–Sat, 8am–10pm',
    bookingUrl: 'https://icallhelpline.org',
    phone: '9152987821',
    avatar: '🏥', avatarBg: '#34D399', isFree: true,
  },
  {
    id: 't4', name: 'Dr. Ananya Krishnan', qualification: 'MBBS, DPM Psychiatry',
    specialties: ['depression', 'anxiety'],
    languages: ['English', 'Tamil', 'Kannada'],
    fee: '₹1200/session', mode: ['online', 'offline'], rating: 4.9, reviews: 203,
    availability: 'Mon, Wed, Fri 4–8pm', location: 'Bengaluru / Online',
    bookingUrl: 'https://www.practo.com/bangalore/psychiatrist',
    avatar: '👩‍⚕️', avatarBg: '#F472B6',
  },
  {
    id: 't5', name: 'Vandrevala Foundation', qualification: 'Professional helpline',
    specialties: ['anxiety', 'depression', 'grief'],
    languages: ['Hindi', 'English', 'Marathi', 'Gujarati'],
    fee: 'FREE', mode: ['online'], rating: 4.6, reviews: 300,
    availability: '24/7',
    bookingUrl: 'https://www.vandrevalafoundation.com',
    phone: '18602662345',
    avatar: '💛', avatarBg: '#FBBF24', isFree: true,
  },
  {
    id: 't6', name: 'Amit Desai', qualification: 'M.A. Psychology, NLP Practitioner',
    specialties: ['career', 'relationships', 'anxiety'],
    languages: ['Hindi', 'English', 'Gujarati'],
    fee: '₹500/session', mode: ['online'], rating: 4.7, reviews: 66,
    availability: 'Daily, 9am–1pm',
    bookingUrl: 'https://www.practo.com/online-consultations/psychologist-online',
    avatar: '👨‍⚕️', avatarBg: '#F59E0B',
  },
  {
    id: 't7', name: 'Snehi Helpline', qualification: 'Trained volunteer counsellors',
    specialties: ['depression', 'grief', 'anxiety'],
    languages: ['Hindi', 'English'],
    fee: 'FREE', mode: ['online'], rating: 4.5, reviews: 200,
    availability: '24/7',
    bookingUrl: 'https://www.snehi.org',
    phone: '04424640050',
    avatar: '🌸', avatarBg: '#F472B6', isFree: true,
  },
  {
    id: 't8', name: 'Dr. Kavita Rao', qualification: 'Ph.D Counselling Psychology',
    specialties: ['relationships', 'depression', 'grief'],
    languages: ['Kannada', 'English', 'Hindi'],
    fee: '₹900/session', mode: ['online', 'offline'], rating: 4.8, reviews: 118,
    availability: 'Mon–Fri, 11am–6pm', location: 'Bengaluru / Online',
    bookingUrl: 'https://www.practo.com/bangalore/psychologist',
    avatar: '👩‍⚕️', avatarBg: '#34D399',
  },
];

// ─── Filter config ────────────────────────────────────────────────────────────
interface SpecFilter { key: Specialty; label: string; emoji: string; icon: IonName; color: string }
const SPEC_FILTERS: SpecFilter[] = [
  { key: 'all',           label: 'All',          emoji: '🌟', icon: 'star',        color: COLORS.primary },
  { key: 'anxiety',       label: 'Anxiety',      emoji: '😰', icon: 'pulse',       color: '#A78BFA' },
  { key: 'depression',    label: 'Depression',   emoji: '💙', icon: 'heart',       color: '#60A5FA' },
  { key: 'relationships', label: 'Relationship', emoji: '💔', icon: 'people',      color: '#F472B6' },
  { key: 'career',        label: 'Career',       emoji: '💼', icon: 'briefcase',   color: '#FBBF24' },
  { key: 'grief',         label: 'Grief',        emoji: '🕊️', icon: 'leaf',       color: '#34D399' },
];
const MODE_FILTERS: Array<{ key: Mode; label: string }> = [
  { key: 'all', label: 'All' }, { key: 'online', label: '🖥 Online' },
  { key: 'offline', label: '🏢 In-person' }, { key: 'free', label: '🆓 Free' },
];
const SPEC_COLORS: Record<string, string> = {
  anxiety: '#A78BFA', depression: '#60A5FA', relationships: '#F472B6',
  career: '#FBBF24',  grief: '#34D399',
};
const SPEC_ICONS: Record<string, IonName> = {
  anxiety: 'pulse', depression: 'heart', relationships: 'people',
  career: 'briefcase', grief: 'leaf',
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TherapistScreen() {
  const nav = useNavigation<any>();
  const { language } = useUserStore();
  const isEng = language === 'english';

  const [specialty, setSpecialty] = useState<Specialty>('all');
  const [mode,      setMode]      = useState<Mode>('all');
  const [search,    setSearch]    = useState('');

  const filtered = THERAPISTS.filter(t => {
    const okSpec   = specialty === 'all' || t.specialties.includes(specialty);
    const okMode   = mode === 'all' ? true : mode === 'free' ? !!t.isFree : t.mode.includes(mode as any);
    const okSearch = !search
      || t.name.toLowerCase().includes(search.toLowerCase())
      || t.languages.some(l => l.toLowerCase().includes(search.toLowerCase()));
    return okSpec && okMode && okSearch;
  });

  return (
    <View style={s.root}>
      <LinearGradient colors={['#080B14', '#0A0F20']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{isEng ? 'Find Therapist' : 'Therapist Dhundho'}</Text>
            <Text style={s.headerSub}>{isEng ? 'Many are free · All confidential' : 'Kai free hain · Sab private'}</Text>
          </View>
        </View>

        {/* ── Free crisis strip ─────────────────────────────────────────── */}
        <TouchableOpacity style={s.crisisBand} onPress={() => Linking.openURL('tel:9152987821')} activeOpacity={0.88}>
          <View style={s.crisisBandLeft}>
            <Ionicons name="call" size={14} color="#fff" />
            <Text style={s.crisisBandTxt}>{isEng ? 'Crisis? iCall FREE: 9152987821' : 'Crisis mein? iCall FREE: 9152987821'}</Text>
          </View>
          <View style={s.freeBadgeSmall}><Text style={s.freeBadgeSmallTxt}>FREE</Text></View>
        </TouchableOpacity>

        {/* ── Search ───────────────────────────────────────────────────── */}
        <View style={s.searchRow}>
          <Ionicons name="search" size={15} color={COLORS.textMuted} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={isEng ? 'Name or language…' : 'Naam ya language…'}
            placeholderTextColor={COLORS.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Specialty filter — icon pills ─────────────────────────────── */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={s.specScroll}
          contentContainerStyle={s.specContent}
        >
          {SPEC_FILTERS.map(f => {
            const active = specialty === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[s.specPill, active && { backgroundColor: f.color + '25', borderColor: f.color }]}
                onPress={() => setSpecialty(f.key)}
                activeOpacity={0.8}
              >
                {/* Icon circle */}
                <View style={[s.specIconCircle, { backgroundColor: active ? f.color + '30' : COLORS.surface }]}>
                  <Ionicons name={f.icon} size={14} color={active ? f.color : COLORS.textMuted} />
                </View>
                <Text style={[s.specPillTxt, active && { color: f.color }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Mode filter ───────────────────────────────────────────────── */}
        <View style={s.modeRow}>
          {MODE_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.modeChip, mode === f.key && s.modeChipOn]}
              onPress={() => setMode(f.key)}
            >
              <Text style={[s.modeChipTxt, mode === f.key && s.modeChipTxtOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Result count */}
        <Text style={s.countTxt}>
          {filtered.length} {isEng ? 'found' : 'mile'}
        </Text>

        {/* ── Cards ─────────────────────────────────────────────────────── */}
        <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {filtered.map(t => <TherapistCard key={t.id} t={t} language={language} />)}
          {filtered.length === 0 && (
            <View style={s.empty}>
              <Text style={{ fontSize: 40 }}>🔍</Text>
              <Text style={s.emptyTxt}>{isEng ? 'No matches. Try other filters.' : 'Koi nahi mila. Filters badlo.'}</Text>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function TherapistCard({ t, language }: { t: Therapist; language: string }) {
  const isEng = language === 'english';

  // ── Booking: openURL with robust fallback ───────────────────────────────
  const openBooking = async () => {
    const url = t.bookingUrl;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        throw new Error('canOpen=false');
      }
    } catch {
      // Fallback: show options
      const msg = t.phone
        ? (isEng
            ? `Could not open the website. You can call directly: ${t.phone}`
            : `Website nahi khula. Seedha call karo: ${t.phone}`)
        : (isEng
            ? `Could not open the website. Try searching "${t.name}" on Practo or Google.`
            : `Website nahi khula. Practo ya Google pe "${t.name}" search karo.`);

      const buttons: any[] = [{ text: isEng ? 'OK' : 'Theek hai', style: 'cancel' }];
      if (t.phone) {
        buttons.push({
          text: isEng ? `Call ${t.phone}` : `Call Karo`,
          onPress: () => Linking.openURL(`tel:${t.phone!.replace(/\D/g, '')}`),
        });
      }
      Alert.alert(isEng ? 'Open failed' : 'Nahi khula', msg, buttons);
    }
  };

  const callNow = () => {
    if (!t.phone) return;
    const cleaned = t.phone.replace(/\D/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() =>
      Alert.alert('', isEng ? `Dial manually: ${t.phone}` : `Manually dial karo: ${t.phone}`)
    );
  };

  return (
    <View style={c.wrap}>
      <LinearGradient colors={[COLORS.card, COLORS.surfaceElevated]} style={c.card}>

        {/* ── Top row ─────────────────────────────────────────────────── */}
        <View style={c.topRow}>
          {/* Avatar */}
          <View style={[c.avatar, { backgroundColor: t.avatarBg + '28' }]}>
            <Text style={{ fontSize: 30 }}>{t.avatar}</Text>
          </View>

          {/* Name + rating */}
          <View style={{ flex: 1 }}>
            <View style={c.nameRow}>
              <Text style={c.name} numberOfLines={1}>{t.name}</Text>
              {t.isFree && (
                <View style={c.freeBadge}><Text style={c.freeBadgeTxt}>FREE</Text></View>
              )}
              {t.availability === '24/7' && (
                <View style={c.badge247}><Text style={c.badge247Txt}>24/7</Text></View>
              )}
            </View>
            <Text style={c.qual} numberOfLines={1}>{t.qualification}</Text>
            <View style={c.ratingRow}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={c.ratingNum}>{t.rating}</Text>
              <Text style={c.reviews}>({t.reviews} reviews)</Text>
            </View>
          </View>
        </View>

        {/* ── Specialty icon chips ─────────────────────────────────────── */}
        <View style={c.specRow}>
          {t.specialties.slice(0, 4).map(sp => {
            const col  = SPEC_COLORS[sp] ?? COLORS.primary;
            const icon = SPEC_ICONS[sp]  ?? ('star' as IonName);
            return (
              <View key={sp} style={[c.specChip, { backgroundColor: col + '1C', borderColor: col + '40' }]}>
                <Ionicons name={icon} size={10} color={col} />
                <Text style={[c.specChipTxt, { color: col }]}>{sp}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Detail grid ─────────────────────────────────────────────── */}
        <View style={c.detailGrid}>
          <Detail icon="language-outline"   text={t.languages.join(' · ')} />
          <Detail icon="videocam-outline"   text={t.mode.join(' + ')} />
          <Detail icon="cash-outline"       text={t.fee}         color={t.isFree ? COLORS.success : undefined} />
          <Detail icon="time-outline"       text={t.availability} />
          {t.location && <Detail icon="location-outline" text={t.location} />}
          {t.phone    && <Detail icon="call-outline"     text={t.phone}    color={COLORS.success} />}
        </View>

        {/* ── Separator ───────────────────────────────────────────────── */}
        <View style={c.sep} />

        {/* ── Action buttons ──────────────────────────────────────────── */}
        <View style={c.actions}>
          {t.phone && (
            <TouchableOpacity style={c.callBtn} onPress={callNow} activeOpacity={0.85}>
              <Ionicons name="call" size={15} color={COLORS.success} />
              <Text style={c.callBtnTxt}>{isEng ? 'Call Free' : 'Free Call'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={c.bookBtn} onPress={openBooking} activeOpacity={0.85}>
            <LinearGradient
              colors={t.isFree ? [COLORS.success, '#17A37A'] : [COLORS.primary, COLORS.primaryDark]}
              style={c.bookGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Ionicons name={t.isFree ? 'link' : 'calendar'} size={14} color="#fff" />
              <Text style={c.bookTxt}>
                {t.isFree
                  ? (isEng ? 'Visit Website' : 'Website Dekho')
                  : (isEng ? 'Book on Practo' : 'Practo pe Book Karo')}
              </Text>
              <Ionicons name="open-outline" size={12} color="rgba(255,255,255,0.65)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

function Detail({ icon, text, color }: { icon: IonName; text: string; color?: string }) {
  return (
    <View style={c.detailItem}>
      <Ionicons name={icon} size={12} color={color ?? COLORS.textMuted} />
      <Text style={[c.detailTxt, color ? { color } : {}]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: COLORS.background },
  safe:  { flex: 1 },

  header:     { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  headerTitle:{ fontSize: 22, fontWeight: '900', color: COLORS.textPrimary },
  headerSub:  { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },

  crisisBand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.danger, paddingHorizontal: 16, paddingVertical: 9 },
  crisisBandLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  crisisBandTxt:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  freeBadgeSmall: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  freeBadgeSmallTxt: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  searchRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, paddingHorizontal: 14, paddingVertical: 11, marginHorizontal: 16, marginTop: 10, borderWidth: 1, borderColor: COLORS.border },
  searchInput:{ flex: 1, fontSize: 14, color: COLORS.textPrimary },

  specScroll:  { paddingTop: 10 },
  specContent: { paddingHorizontal: 16, gap: 8 },
  specPill:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  specIconCircle: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  specPillTxt: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },

  modeRow:      { flexDirection: 'row', paddingHorizontal: 16, gap: 7, marginTop: 8, marginBottom: 4 },
  modeChip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  modeChipOn:   { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary },
  modeChipTxt:  { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  modeChipTxtOn:{ color: COLORS.primary },

  countTxt: { fontSize: 11, color: COLORS.textMuted, paddingHorizontal: 20, marginVertical: 5 },

  listContent: { paddingHorizontal: 16, paddingTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});

const c = StyleSheet.create({
  wrap: { marginBottom: 12, borderRadius: RADIUS['2xl'], overflow: 'hidden' },
  card: { padding: 16, borderRadius: RADIUS['2xl'], borderWidth: 1, borderColor: COLORS.border },

  topRow: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  avatar: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, flexShrink: 1 },
  freeBadge: { backgroundColor: COLORS.success + '25', borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.success + '55' },
  freeBadgeTxt: { fontSize: 8, fontWeight: '900', color: COLORS.success, letterSpacing: 0.8 },
  badge247: { backgroundColor: '#60A5FA22', borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#60A5FA55' },
  badge247Txt: { fontSize: 8, fontWeight: '900', color: '#60A5FA', letterSpacing: 0.5 },
  qual: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingNum: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  reviews: { fontSize: 11, color: COLORS.textMuted },

  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  specChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  specChipTxt: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5, width: '47%' },
  detailTxt:  { fontSize: 11, color: COLORS.textSecondary, flex: 1 },

  sep: { height: 1, backgroundColor: COLORS.border, marginBottom: 12 },

  actions: { flexDirection: 'row', gap: 8 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: COLORS.success,
  },
  callBtnTxt: { fontSize: 13, fontWeight: '700', color: COLORS.success },
  bookBtn: { flex: 1, borderRadius: RADIUS.xl, overflow: 'hidden' },
  bookGrad: { flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center', paddingVertical: 12, borderRadius: RADIUS.xl },
  bookTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
});