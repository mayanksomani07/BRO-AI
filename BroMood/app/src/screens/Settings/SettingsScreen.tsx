import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { COLORS, RADIUS } from '../../constants/theme';
import { useUserStore, AppLanguage } from '../../store/userStore';
import { wipeAllData, exportAllData } from '../../db/queries';
import EmergencyButton from '../../components/EmergencyButton';

const LANGUAGES: { key: AppLanguage; label: string; native: string }[] = [
  { key: 'hinglish', label: 'Hinglish', native: 'Hinglish (हिंग्लिश)' },
  { key: 'hindi', label: 'Hindi', native: 'हिंदी' },
  { key: 'english', label: 'English', native: 'English' },
  { key: 'bengali', label: 'Bengali', native: 'বাংলা' },
  { key: 'kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { key: 'tamil', label: 'Tamil', native: 'தமிழ்' },
  { key: 'marathi', label: 'Marathi', native: 'मराठी' },
  { key: 'telugu', label: 'Telugu', native: 'తెలుగు' },
];

export default function SettingsScreen() {
  const {
    language, name, keyboardEnabled, healthkitEnabled, cloudBackupEnabled,
    setLanguage, toggleKeyboard, toggleHealthkit, toggleCloudBackup,
  } = useUserStore();
  const navigation = useNavigation<any>();
  const [showLanguages, setShowLanguages] = useState(false);

  const handleExportData = async () => {
    const data = await exportAllData();
    await Share.share({
      message: JSON.stringify(data, null, 2),
      title: 'BroMood Data Export',
    });
  };

  const handleDeleteData = () => {
    Alert.alert(
      language === 'english' ? 'Delete All Data?' : 'Sab data delete karein?',
      language === 'english'
        ? 'This will permanently wipe all your mood logs, journal, and chat history.'
        : 'Ye sab mood logs, journal, aur chat history permanently delete kar dega.',
      [
        { text: language === 'english' ? 'Cancel' : 'Ruko', style: 'cancel' },
        {
          text: language === 'english' ? 'Delete Everything' : 'Sab Delete Karo',
          style: 'destructive',
          onPress: async () => { await wipeAllData(); Alert.alert('Done', 'All data deleted.'); }
        }
      ]
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[COLORS.background, '#0A0E1F']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>
            {language === 'english' ? 'Settings' : 'Settings'}
          </Text>

          {/* Profile */}
          <SectionHeader title={language === 'english' ? 'Profile' : 'Profile'} />
          <SettingCard>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.profileName}>{name}</Text>
                <Text style={styles.profileSub}>
                  {language === 'english' ? 'BroMood member' : 'BroMood member'}
                </Text>
              </View>
            </View>
          </SettingCard>

          {/* Language */}
          <SectionHeader title={language === 'english' ? 'Language' : 'Bhasha'} />
          <SettingCard>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowLanguages(!showLanguages)}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="language" size={20} color={COLORS.primary} />
                <Text style={styles.settingLabel}>
                  {language === 'english' ? 'App Language' : 'App ki Bhasha'}
                </Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>
                  {LANGUAGES.find(l => l.key === language)?.native ?? language}
                </Text>
                <Ionicons
                  name={showLanguages ? 'chevron-up' : 'chevron-down'}
                  size={16} color={COLORS.textMuted}
                />
              </View>
            </TouchableOpacity>
            {showLanguages && (
              <View style={styles.langList}>
                {LANGUAGES.map(l => (
                  <TouchableOpacity
                    key={l.key}
                    style={[styles.langOption, language === l.key && styles.langOptionActive]}
                    onPress={() => { setLanguage(l.key); setShowLanguages(false); }}
                  >
                    <Text style={[styles.langText, language === l.key && styles.langTextActive]}>
                      {l.native}
                    </Text>
                    {language === l.key && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </SettingCard>

          {/* Privacy Controls */}
          <SectionHeader title={language === 'english' ? 'Privacy & Data' : 'Privacy & Data'} />
          <SettingCard>
            <ToggleRow
              icon="keyboard"
              label={language === 'english' ? 'Keyboard Data Collection' : 'Keyboard Data'}
              sub={language === 'english' ? 'Keystroke metadata only — never text' : 'Sirf metadata — text nahi'}
              value={keyboardEnabled}
              onToggle={toggleKeyboard}
              color={COLORS.primary}
            />
            <Divider />
            <ToggleRow
              icon="heart"
              label={language === 'english' ? 'HealthKit Sleep Sync' : 'HealthKit Sleep'}
              sub={language === 'english' ? 'Sleep data to detect mood' : 'Neend data se mood detect'}
              value={healthkitEnabled}
              onToggle={toggleHealthkit}
              color={COLORS.success}
            />
            <Divider />
            <ToggleRow
              icon="cloud"
              label={language === 'english' ? 'Cloud Backup' : 'Cloud Backup'}
              sub={language === 'english' ? 'Anonymised trends only' : 'Sirf anonymised trends'}
              value={cloudBackupEnabled}
              onToggle={toggleCloudBackup}
              color={COLORS.warning}
            />
          </SettingCard>

          {/* Data Actions */}
          <SectionHeader title={language === 'english' ? 'Your Data' : 'Tera Data'} />
          <SettingCard>
            <ActionRow
              icon="download"
              label={language === 'english' ? 'Export My Data' : 'Data Export Karo'}
              onPress={handleExportData}
              color={COLORS.primary}
            />
            <Divider />
            <ActionRow
              icon="trash"
              label={language === 'english' ? 'Delete Everything' : 'Sab Delete Karo'}
              onPress={handleDeleteData}
              color={COLORS.danger}
            />
          </SettingCard>

          {/* Keyboard Setup Guide */}
          <SectionHeader title={language === 'english' ? 'Setup' : 'Setup'} />
          <SettingCard>
            <TouchableOpacity style={styles.guideCard} activeOpacity={0.85}>
              <View style={styles.guideLeft}>
                <Ionicons name="keypad" size={22} color={COLORS.primary} />
                <View>
                  <Text style={styles.guideTitle}>
                    {language === 'english' ? 'Enable BroMood Keyboard' : 'BroMood Keyboard Enable Karo'}
                  </Text>
                  <Text style={styles.guideSub}>
                    Settings → General → Keyboard → Keyboards → Add New Keyboard
                  </Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </SettingCard>

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle" size={16} color={COLORS.textMuted} />
            <Text style={styles.disclaimerText}>
              {language === 'english'
                ? 'BroMood is not a medical device. It offers peer-style support, not professional diagnosis.'
                : 'Ye app doctor nahi hai. Sirf ek dost ki tarah support karta hai.'}
            </Text>
          </View>

          <Text style={styles.version}>BroMood v1.0.0</Text>
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
      <EmergencyButton />
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <LinearGradient colors={[COLORS.card, COLORS.surfaceElevated]} style={styles.cardGradient}>
        {children}
      </LinearGradient>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function ToggleRow({ icon, label, sub, value, onToggle, color }: {
  icon: string; label: string; sub: string; value: boolean;
  onToggle: () => void; color: string;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={20} color={color} />
        <View>
          <Text style={styles.settingLabel}>{label}</Text>
          <Text style={styles.settingSub}>{sub}</Text>
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
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={[styles.settingLabel, { color }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 20 },
  sectionHeader: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    color: COLORS.textMuted, textTransform: 'uppercase',
    marginTop: 20, marginBottom: 8, marginLeft: 4,
  },
  card: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 2 },
  cardGradient: { borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary + '30', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  profileName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  profileSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  settingSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, maxWidth: 180 },
  settingValue: { fontSize: 13, color: COLORS.textSecondary },

  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },

  langList: { paddingHorizontal: 16, paddingBottom: 12 },
  langOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: RADIUS.lg, marginBottom: 4,
  },
  langOptionActive: { backgroundColor: COLORS.primaryGlow },
  langText: { fontSize: 15, color: COLORS.textSecondary },
  langTextActive: { color: COLORS.primary, fontWeight: '700' },

  guideCard: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  guideLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  guideTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 3 },
  guideSub: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },

  disclaimer: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, marginTop: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  disclaimerText: { fontSize: 12, color: COLORS.textMuted, flex: 1, lineHeight: 18 },
  version: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginTop: 16 },
});
