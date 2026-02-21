import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Alert, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeIn } from 'react-native-reanimated';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useMood } from '@/lib/mood-context';
import { MOOD_CONFIG, type JournalEntry } from '@/lib/mood-analyzer';
import colors from '@/constants/colors';

function JournalCard({ entry, onDelete }: { entry: JournalEntry; onDelete: (id: string) => void }) {
  const config = MOOD_CONFIG[entry.detectedMood];
  const date = new Date(entry.timestamp);
  const timeStr = date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
  const dateStr = date.toLocaleDateString('en', { month: 'short', day: 'numeric' });

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.journalCard}>
      <View style={styles.journalHeader}>
        <View style={styles.journalMeta}>
          <Text style={styles.journalDate}>{dateStr} at {timeStr}</Text>
          <View style={[styles.sentimentBadge, { backgroundColor: config.color + '15' }]}>
            <Ionicons name={config.icon as any} size={12} color={config.color} />
            <Text style={[styles.sentimentText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Alert.alert('Delete entry?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(entry.id) },
            ]);
          }}
          hitSlop={12}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
        </Pressable>
      </View>
      <Text style={styles.journalText} numberOfLines={4}>{entry.text}</Text>
      {entry.sentimentScore !== 0 && (
        <View style={styles.analysisRow}>
          <Ionicons name="analytics-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.analysisText}>
            Sentiment: {entry.sentimentScore > 0 ? 'Positive' : entry.sentimentScore < -0.2 ? 'Needs attention' : 'Neutral'}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { journals, addJournal, removeJournal } = useMood();
  const [text, setText] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const typingStart = useRef<number>(0);
  const inputRef = useRef<TextInput>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const handleStartWriting = () => {
    setIsWriting(true);
    typingStart.current = Date.now();
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const duration = Date.now() - typingStart.current;
    await addJournal(text.trim(), duration);
    setText('');
    setIsWriting(false);
    inputRef.current?.blur();
  };

  const handleCancel = () => {
    if (text.trim()) {
      Alert.alert('Discard entry?', 'Your unsaved text will be lost.', [
        { text: 'Keep writing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { setText(''); setIsWriting(false); } },
      ]);
    } else {
      setText('');
      setIsWriting(false);
    }
  };

  const renderItem = useCallback(({ item }: { item: JournalEntry }) => (
    <JournalCard entry={item} onDelete={removeJournal} />
  ), [removeJournal]);

  const keyExtractor = useCallback((item: JournalEntry) => item.id, []);

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top + webTopInset }]} behavior="padding" keyboardVerticalOffset={0}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Journal</Text>
          <Text style={styles.subtitle}>Express your thoughts freely</Text>
        </View>
        {!isWriting && (
          <Pressable
            onPress={handleStartWriting}
            style={({ pressed }) => [styles.newBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      {isWriting && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.editorCard}>
          <TextInput
            ref={inputRef}
            style={styles.editorInput}
            placeholder="What's on your mind today? Write freely about your thoughts, feelings, and experiences..."
            placeholderTextColor={colors.textTertiary}
            multiline
            value={text}
            onChangeText={setText}
            autoFocus
            maxLength={2000}
          />
          <View style={styles.editorFooter}>
            <Text style={styles.charCount}>{text.length}/2000</Text>
            <View style={styles.editorActions}>
              <Pressable onPress={handleCancel} style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { opacity: pressed ? 0.85 : text.trim() ? 1 : 0.5 },
                ]}
                disabled={!text.trim()}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.submitText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}

      <FlatList
        data={journals}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!journals.length}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No journal entries yet</Text>
            <Text style={styles.emptyText}>
              Tap the + button to write about your day. Your words help us understand how you're feeling.
            </Text>
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 4,
  },
  newBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  editorCard: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  editorInput: {
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  editorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
  },
  editorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  submitText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  journalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  journalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  journalDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  sentimentText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  journalText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    lineHeight: 22,
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  analysisText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
