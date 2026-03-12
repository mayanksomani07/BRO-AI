/**
 * MoreScreen — hamburger hub with ALL app sections
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS } from '../../constants/theme';
import { useUserStore } from '../../store/userStore';
import { useMoodStore } from '../../store/moodStore';

type IonN = keyof typeof Ionicons.glyphMap;
interface Item {
  id: string; en: string; hi: string;
  sub: string; subHi: string;
  icon: IonN; color: string;
  screen?: string; url?: string; badge?: string;
}

const ITEMS: Item[] = [
  { id: 'tasks',     en: 'Daily Tasks',     hi: 'Aaj ke Tasks',      sub: 'Challenges + XP rewards',        subHi: 'Challenges aur XP milega',     icon: 'checkbox',            color: '#60A5FA', screen: 'Tasks'     },
  { id: 'journal',   en: 'Journal',         hi: 'Journal',            sub: 'Write privately, always safe',   subHi: 'Freely likh, private hai',     icon: 'book',                color: '#A78BFA', screen: 'Journal'   },
  { id: 'music',     en: 'Calm Music',      hi: 'Calm Music',         sub: 'Ambient sounds & breathing',     subHi: 'Saans lo, music suno',         icon: 'musical-notes',       color: '#F472B6', screen: 'Music'     },
  { id: 'therapist', en: 'Find Therapist',  hi: 'Therapist Dhundo',   sub: 'Real help from real people',     subHi: 'Practo pe real help',          icon: 'people',              color: '#34D399', screen: 'Therapist' },
  { id: 'settings',  en: 'Settings',        hi: 'Settings',           sub: 'Language, privacy & data',       subHi: 'Bhasha, privacy, data',        icon: 'settings-outline',    color: '#94A3B8', screen: 'Settings'  },
  { id: 'crisis',    en: 'Crisis Help',     hi: 'Crisis Help',        sub: 'Emergency support resources',    subHi: 'Emergency madad ke resources', icon: 'shield',              color: '#FF4757', screen: 'Emergency', badge: 'URGENT' },
  { id: 'icall',     en: 'iCall — Free',    hi: 'iCall — Free',       sub: 'Call now · 9152987821',          subHi: 'Abhi call karo · 9152987821',  icon: 'call',                color: '#34D399', url: 'tel:9152987821',    badge: 'FREE' },
  { id: 'vf',        en: 'Vandrevala 24/7', hi: 'Vandrevala 24/7',    sub: '1860-2662-345 · Always open',    subHi: '1860-2662-345 · Hamesha open', icon: 'heart',               color: '#FBBF24', url: 'tel:18602662345',   badge: 'FREE' },
];

export default function MoreScreen() {
  const nav = useNavigation<any>();
  const { language } = useUserStore();
  const { currentSnapshot } = useMoodStore();
  const score = currentSnapshot?.score ?? 5;
  const isEng = language === 'english';

  const press = (item: Item) =>
    item.url ? Linking.openURL(item.url).catch(() => {}) : nav.navigate(item.screen!);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#080B14', '#0A0F20']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>{isEng ? 'More' : 'Aur'}</Text>
              <Text style={s.sub}>{isEng ? 'All your tools' : 'Sab kuch yahaan'}</Text>
            </View>
            <Ionicons name="menu" size={26} color={COLORS.textMuted} />
          </View>

          {/* Low-mood crisis strip */}
          {score < 4 && (
            <TouchableOpacity style={s.crisisBanner} onPress={() => nav.navigate('Emergency')} activeOpacity={0.88}>
              <Ionicons name="warning" size={17} color="#fff" />
              <Text style={s.crisisText}>{isEng ? 'Mood is low — get support now' : 'Mood low hai — madad le abhi'}</Text>
              <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}

          {/* Grid */}
          <View style={s.grid}>
            {ITEMS.map(item => (
              <TouchableOpacity key={item.id} style={s.card} activeOpacity={0.82} onPress={() => press(item)}>
                <LinearGradient colors={[item.color + '1C', item.color + '09']} style={s.cardGrad}>
                  {item.badge && (
                    <View style={[s.badge, { backgroundColor: item.color + '30' }]}>
                      <Text style={[s.badgeTxt, { color: item.color }]}>{item.badge}</Text>
                    </View>
                  )}
                  <View style={[s.iconBox, { backgroundColor: item.color + '22' }]}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>
                  <Text style={s.cardTitle}>{isEng ? item.en : item.hi}</Text>
                  <Text style={s.cardSub} numberOfLines={2}>{isEng ? item.sub : item.subHi}</Text>
                  <View style={[s.arrow, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.url ? 'call-outline' : 'arrow-forward'} size={13} color={item.color} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.note}>
            <Ionicons name="lock-closed-outline" size={13} color={COLORS.textMuted} />
            <Text style={s.noteTxt}>{isEng ? 'All helplines are free & confidential' : 'Sab helplines free aur private hain'}</Text>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.background },
  safe:    { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 14 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:   { fontSize: 26, fontWeight: '900', color: COLORS.textPrimary },
  sub:     { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  crisisBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.danger, borderRadius: RADIUS.xl, padding: 14, marginBottom: 16 },
  crisisText:   { flex: 1, color: '#fff', fontWeight: '700', fontSize: 13 },
  grid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card:    { width: '47.5%', borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardGrad:  { padding: 14, minHeight: 148, justifyContent: 'space-between' },
  badge:     { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full, marginBottom: 6 },
  badgeTxt:  { fontSize: 8, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  iconBox:   { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginBottom: 9 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 3 },
  cardSub:   { fontSize: 10, color: COLORS.textSecondary, lineHeight: 15, flex: 1 },
  arrow:     { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end', marginTop: 8 },
  note:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingHorizontal: 2 },
  noteTxt:   { fontSize: 11, color: COLORS.textMuted },
});