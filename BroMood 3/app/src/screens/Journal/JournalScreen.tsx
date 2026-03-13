import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';

import { COLORS, getMoodColor, RADIUS } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../store/userStore';
import { useMoodStore } from '../../store/moodStore';
import { insertJournalEntry, getJournalEntries, deleteJournalEntry, JournalEntry } from '../../db/queries';
import { analyzeJournalEntry } from '../../api/gemini';
import EmergencyButton from '../../components/EmergencyButton';

// Base64 encode/decode — btoa/atob are available in React Native (no Buffer needed)
function encrypt(text: string): string {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch {
    return btoa(text);
  }
}
function decrypt(text: string): string {
  try {
    return decodeURIComponent(escape(atob(text)));
  } catch {
    try { return atob(text); }
    catch { return '[encrypted]'; }
  }
}

export default function JournalScreen() {
  const { t } = useTranslation();
  const { language } = useUserStore();
  const { currentSnapshot, updateJournalSentiment } = useMoodStore();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    const data = await getJournalEntries(50);
    setEntries(data);
  };

  const handleSave = async () => {
    if (!draftText.trim() || draftText.trim().length < 10) return;

    setIsAnalyzing(true);
    try {
      // Analyze sentiment
      const sentiment = await analyzeJournalEntry(draftText, language);

      // Update mood store with sentiment
      updateJournalSentiment(
        sentiment.score,
        sentiment.themes ?? [],
        sentiment.urgencyFlag ?? false
      );

      // Encrypt and save
      const encrypted = encrypt(draftText);
      await insertJournalEntry({
        content_encrypted: encrypted,
        sentiment: sentiment.sentiment,
        detected_themes: JSON.stringify(sentiment.themes ?? []),
        mood_score_at_time: currentSnapshot?.score ?? null,
        created_at: Date.now(),
      });

      setDraftText('');
      setIsWriting(false);
      await loadEntries();

      if (sentiment.urgencyFlag) {
        Alert.alert(
          t('emergency.title'),
          t('emergency.sub'),
          [{ text: t('settings.cancel'), style: 'cancel' }]
        );
      }
    } catch (err) {
      // Save without analysis on error
      await insertJournalEntry({
        content_encrypted: encrypt(draftText),
        sentiment: null,
        detected_themes: null,
        mood_score_at_time: currentSnapshot?.score ?? null,
        created_at: Date.now(),
      });
      setDraftText('');
      setIsWriting(false);
      await loadEntries();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t('settings.delete_title'),
      t('settings.delete_body'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteJournalEntry(id);
            await loadEntries();
          }
        }
      ]
    );
  };

  const renderEntry = ({ item }: { item: JournalEntry }) => {
    const decrypted = decrypt(item.content_encrypted);
    const themes: string[] = item.detected_themes ? JSON.parse(item.detected_themes) : [];
    const sentimentColor = item.sentiment === 'positive' ? COLORS.success
      : item.sentiment === 'negative' ? COLORS.warning
      : item.sentiment === 'critical' ? COLORS.danger
      : COLORS.textMuted;

    return (
      <View style={styles.entryCard}>
        <LinearGradient colors={[COLORS.card, COLORS.surfaceElevated]} style={styles.entryGradient}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryDate}>
              {new Date(item.created_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <View style={styles.entryMeta}>
              {item.mood_score_at_time && (
                <View style={[styles.moodDot, { backgroundColor: getMoodColor(item.mood_score_at_time) }]} />
              )}
              {item.sentiment && (
                <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor + '20', borderColor: sentimentColor + '40' }]}>
                  <Text style={[styles.sentimentText, { color: sentimentColor }]}>{item.sentiment}</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.entryText} numberOfLines={4}>{decrypted}</Text>
          {themes.length > 0 && (
            <View style={styles.themeList}>
              {themes.slice(0, 3).map(theme => (
                <View key={theme} style={styles.themeChip}>
                  <Text style={styles.themeChipText}>{theme.replace('_', ' ')}</Text>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[COLORS.background, '#0A0E1F']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t('journal.title')}
          </Text>
          <TouchableOpacity
            style={styles.writeBtn}
            onPress={() => setIsWriting(true)}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.writeBtnGrad}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.writeBtnText}>
                {t('journal.write')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <FlatList
          data={entries}
          keyExtractor={e => e.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📔</Text>
              <Text style={styles.emptyTitle}>
                {t('journal.empty_title')}
              </Text>
              <Text style={styles.emptySub}>
                {false
                  ? 'Write your first entry. Just a few lines is enough.'
                  : 'Pehli entry likh. Bas kuch lines kaafi hain.'}
              </Text>
            </View>
          }
        />

        {/* Write Modal */}
        <Modal visible={isWriting} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modal}>
            <LinearGradient colors={[COLORS.background, '#0A0E1F']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setIsWriting(false); setDraftText(''); }}>
                <Text style={styles.modalCancel}>
                  {'Cancel'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isAnalyzing || !draftText.trim()}
              >
                <Text style={[styles.modalSave, !draftText.trim() && styles.modalSaveDisabled]}>
                  {isAnalyzing ? '...' : ('Save')}
                </Text>
              </TouchableOpacity>
            </View>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <TextInput
                style={styles.journalInput}
                value={draftText}
                onChangeText={setDraftText}
                placeholder={t('journal.placeholder')}
                placeholderTextColor={COLORS.textMuted}
                multiline
                autoFocus
                maxLength={5000}
              />
            </KeyboardAvoidingView>
            {isAnalyzing && (
              <View style={styles.analyzingBanner}>
                <Ionicons name="pulse" size={16} color={COLORS.primary} />
                <Text style={styles.analyzingText}>
                  {t('journal.placeholder')}
                </Text>
              </View>
            )}
          </View>
        </Modal>
      </SafeAreaView>
      <EmergencyButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  writeBtn: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  writeBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  writeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  listContent: { padding: 16, gap: 12 },
  entryCard: { borderRadius: RADIUS.xl, overflow: 'hidden' },
  entryGradient: { padding: 16, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  entryDate: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moodDot: { width: 8, height: 8, borderRadius: 4 },
  sentimentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  sentimentText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  entryText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  themeList: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 },
  themeChip: {
    backgroundColor: COLORS.primary + '15', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  themeChipText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40 },

  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalCancel: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '500' },
  modalTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  modalSave: { fontSize: 16, color: COLORS.primary, fontWeight: '700' },
  modalSaveDisabled: { color: COLORS.textMuted },
  journalInput: {
    flex: 1, fontSize: 17, color: COLORS.textPrimary,
    padding: 20, lineHeight: 28, textAlignVertical: 'top',
  },
  analyzingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primaryGlow, padding: 14,
    borderTopWidth: 1, borderTopColor: COLORS.borderFocus,
  },
  analyzingText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
});