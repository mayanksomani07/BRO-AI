import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Share, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { COLORS, RADIUS } from '../../constants/theme';
import { useUserStore, AppLanguage } from '../../store/userStore';
import { resetAllData, exportAllData } from '../../db/queries';
import EmergencyButton from '../../components/EmergencyButton';

const LANGUAGES: { key: AppLanguage; native: string; flag: string }[] = [
  { key: 'hinglish', native: 'Hinglish (हिंग्लिश)', flag: '🇮🇳' },
  { key: 'hindi',    native: 'हिंदी',                flag: '🇮🇳' },
  { key: 'english',  native: 'English',               flag: '🇬🇧' },
  { key: 'bengali',  native: 'বাংলা',                 flag: '🇧🇩' },
  { key: 'kannada',  native: 'ಕನ್ನಡ',                flag: '🇮🇳' },
  { key: 'tamil',    native: 'தமிழ்',                 flag: '🇮🇳' },
  { key: 'marathi',  native: 'मराठी',                 flag: '🇮🇳' },
  { key: 'telugu',   native: 'తెలుగు',               flag: '🇮🇳' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const {
    language, name, keyboardEnabled, healthkitEnabled, cloudBackupEnabled,
    setLanguage, toggleKeyboard, toggleHealthkit, toggleCloudBackup,
  } = useUserStore();

  const [showLanguages, setShowLanguages] = useState(false);
  const [changingLang,  setChangingLang]  = useState<AppLanguage | null>(null);

  const handleSelectLanguage = async (lang: AppLanguage) => {
    if (lang === language) { setShowLanguages(false); return; }
    setChangingLang(lang);
    await setLanguage(lang);
    setChangingLang(null);
    setShowLanguages(false);
  };

  const handleExportData = async () => {
    try {
      const data = await exportAllData();
      await Share.share({ message: JSON.stringify(data, null, 2), title: 'BroMood Data Export' });
    } catch (e) { console.warn(e); }
  };

  const handleDeleteData = () => {
    Alert.alert(
      t('settings.delete_title'),
      t('settings.delete_body'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.confirm_delete'),
          style: 'destructive',
          onPress: async () => { await resetAllData(); Alert.alert('Done', 'All data deleted.'); },
        },
      ]
    );
  };

  const currentLang = LANGUAGES.find(l => l.key === language);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#080B14', '#0A0F20']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <Text style={s.headerTitle}>{t('settings.title')}</Text>

          {/* ── PROFILE ── */}
          <SectionHeader title={t('settings.profile')} />
          <Card>
            <View style={s.profileRow}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{name?.charAt(0)?.toUpperCase() ?? 'B'}</Text>
              </View>
              <View>
                <Text style={s.profileName}>{name}</Text>
                <Text style={s.profileSub}>{t('settings.member')}</Text>
              </View>
            </View>
          </Card>

          {/* ── LANGUAGE ── */}
          <SectionHeader title={t('settings.language')} />
          <Card>
            <TouchableOpacity
              style={s.row} activeOpacity={0.7}
              onPress={() => setShowLanguages(v => !v)}
            >
              <View style={s.rowLeft}>
                <View style={s.iconBox}>
                  <Ionicons name="language" size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={s.rowLabel}>{t('settings.app_language')}</Text>
                  <Text style={s.rowSub}>{currentLang?.flag} {currentLang?.native}</Text>
                </View>
              </View>
              <Ionicons
                name={showLanguages ? 'chevron-up' : 'chevron-down'}
                size={16} color={COLORS.textMuted}
              />
            </TouchableOpacity>

            {showLanguages && (
              <View style={s.langGrid}>
                {LANGUAGES.map(l => {
                  const active  = language === l.key;
                  const loading = changingLang === l.key;
                  return (
                    <TouchableOpacity
                      key={l.key}
                      style={[s.langChip, active && s.langChipActive]}
                      onPress={() => handleSelectLanguage(l.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={s.langFlag}>{l.flag}</Text>
                      <Text style={[s.langChipTxt, active && s.langChipTxtActive]}>
                        {l.native}
                      </Text>
                      {active && <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />}
                      {loading && <Ionicons name="sync" size={14} color={COLORS.textMuted} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </Card>

          {/* ── PRIVACY ── */}
          <SectionHeader title={t('settings.privacy')} />
          <Card>
            <ToggleRow
              icon="keypad-outline" color={COLORS.primary}
              label={t('settings.keyboard_label')}
              sub={t('settings.keyboard_sub')}
              value={keyboardEnabled} onToggle={toggleKeyboard}
            />
            <Divider />
            <ToggleRow
              icon="heart" color={COLORS.success}
              label={t('settings.healthkit_label')}
              sub={t('settings.healthkit_sub')}
              value={healthkitEnabled} onToggle={toggleHealthkit}
            />
            <Divider />
            <ToggleRow
              icon="cloud" color={COLORS.warning}
              label={t('settings.cloud_label')}
              sub={t('settings.cloud_sub')}
              value={cloudBackupEnabled} onToggle={toggleCloudBackup}
            />
          </Card>

          {/* ── DATA ── */}
          <SectionHeader title={t('settings.your_data')} />
          <Card>
            <ActionRow
              icon="download" color={COLORS.primary}
              label={t('settings.export')}
              onPress={handleExportData}
            />
            <Divider />
            <ActionRow
              icon="trash" color={COLORS.danger}
              label={t('settings.delete')}
              onPress={handleDeleteData}
            />
          </Card>

          {/* ── SETUP ── */}
          <SectionHeader title={t('settings.setup')} />
          <Card>
            <View style={s.setupRow}>
              <View style={[s.iconBox, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="keypad-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{t('settings.keyboard_setup_title')}</Text>
                <Text style={s.rowSub}>{t('settings.keyboard_setup_sub')}</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
            </View>
          </Card>

          {/* Disclaimer */}
          <View style={s.disclaimer}>
            <Ionicons name="information-circle" size={15} color={COLORS.textMuted} />
            <Text style={s.disclaimerTxt}>{t('settings.disclaimer')}</Text>
          </View>

          <Text style={s.version}>BroMood v1.0.0</Text>
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
      <EmergencyButton />
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}
function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <LinearGradient colors={['#0F172A', '#1A2035']} style={s.cardInner}>
        {children}
      </LinearGradient>
    </View>
  );
}
function Divider() { return <View style={s.divider} />; }

function ToggleRow({ icon, label, sub, value, onToggle, color }: {
  icon: string; label: string; sub: string; value: boolean; onToggle: () => void; color: string;
}) {
  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <View style={[s.iconBox, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rowLabel}>{label}</Text>
          <Text style={s.rowSub}>{sub}</Text>
        </View>
      </View>
      <Switch
        value={value} onValueChange={onToggle}
        trackColor={{ false: COLORS.border, true: color + '60' }}
        thumbColor={value ? color : COLORS.textMuted}
      />
    </View>
  );
}

function ActionRow({ icon, label, onPress, color }: {
  icon: string; label: string; onPress: () => void; color: string;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={s.rowLeft}>
        <View style={[s.iconBox, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={[s.rowLabel, { color }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 18, paddingTop: 16 },

  headerTitle: { fontSize: 26, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 20 },

  sectionHeader: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    color: COLORS.textMuted, textTransform: 'uppercase',
    marginTop: 22, marginBottom: 8, marginLeft: 2,
  },

  card:      { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 4 },
  cardInner: { borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatar:     { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary + '30', justifyContent: 'center', alignItems: 'center' },
  avatarTxt:  { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  profileName:{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  profileSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, gap: 10 },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  rowSub:   { fontSize: 11, color: COLORS.textMuted, marginTop: 2, maxWidth: 220 },

  iconBox:  { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center' },

  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 14 },

  // Language grid — 2 columns
  langGrid: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    width: '47%',
  },
  langChipActive:    { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  langFlag:          { fontSize: 16 },
  langChipTxt:       { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  langChipTxtActive: { color: COLORS.primary, fontWeight: '700' },

  setupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },

  disclaimer:    { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, marginTop: 20, borderWidth: 1, borderColor: COLORS.border },
  disclaimerTxt: { fontSize: 11, color: COLORS.textMuted, flex: 1, lineHeight: 17 },
  version:       { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginTop: 14 },
});
