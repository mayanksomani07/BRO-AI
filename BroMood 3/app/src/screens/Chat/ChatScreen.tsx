import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated, Pressable, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useChatStore, ChatMode } from '../../store/chatStore';
import { typingStart, typingKeystroke, typingFinish } from '../../engine/BiomarkerEngine';
import { useMoodStore } from '../../store/moodStore';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../store/userStore';
import { COLORS, getMoodColor, RADIUS } from '../../constants/theme';
import EmergencyButton from '../../components/EmergencyButton';

const MODES: { key: ChatMode; emoji: string; labelHi: string; labelEn: string }[] = [
  { key: 'vent', emoji: '😤', labelHi: 'Bas sun le', labelEn: 'Just Listen' },
  { key: 'advice', emoji: '💡', labelHi: 'Kuch bata', labelEn: 'Advise Me' },
  { key: 'listen', emoji: '👂', labelHi: 'Samajh', labelEn: 'Understand' },
];

export default function ChatScreen() {
  const { messages, chatMode, isTyping, hasUrgency, setChatMode, sendMessage, loadHistory } = useChatStore();
  const { currentSnapshot } = useMoodStore();
  const { t } = useTranslation();
  const { language } = useUserStore();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const score = currentSnapshot?.score ?? 5;

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  const { applyTypingMetrics } = useMoodStore();

  const handleSend = async () => {
    if (!inputText.trim()) return;
    // Finish typing session 2014 feed metrics to mood engine
    const metrics = typingFinish();
    if (metrics) applyTypingMetrics(metrics);
    const text = inputText.trim();
    setInputText('');
    await sendMessage(text);
  };

  const renderMessage = ({ item }: { item: typeof messages[0] }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
          item.urgencyFlag && styles.urgencyBubble,
        ]}>
          <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
            {item.content}
          </Text>
          <Text style={[styles.bubbleTime, isUser && styles.userBubbleTime]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[COLORS.background, '#0A0E1F']} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Bro_AI</Text>
            <Text style={styles.headerSub}>
              {t('home.bro_ai_sub')}
            </Text>
          </View>
          <View style={[styles.moodBadge, { backgroundColor: getMoodColor(score) + '30', borderColor: getMoodColor(score) + '60' }]}>
            <Text style={[styles.moodBadgeText, { color: getMoodColor(score) }]}>{score}/10</Text>
          </View>
        </View>

        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          {MODES.map(mode => (
            <TouchableOpacity
              key={mode.key}
              style={[styles.modeBtn, chatMode === mode.key && styles.modeBtnActive]}
              onPress={() => setChatMode(mode.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.modeEmoji}>{mode.emoji}</Text>
              <Text style={[styles.modeLabel, chatMode === mode.key && styles.modeLabelActive]}>
                {t(`chat.${mode.key}_mode`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={<EmptyChat />}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        />

        {/* Urgency Banner */}
        {hasUrgency && (
          <View style={styles.urgencyBanner}>
            <Ionicons name="heart" size={18} color={COLORS.danger} />
            <Text style={styles.urgencyText}>
              {t('emergency.sub')}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('tel:9152987821')}>
              <Text style={styles.urgencyCall}>iCall: 9152987821</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}
        >
          <View style={styles.inputArea}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={inputText}
                onFocus={() => typingStart()}
                onChangeText={(t) => { typingKeystroke(t, inputText); setInputText(t); }}
                placeholder={t('chat.placeholder')}
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={1000}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                style={[styles.sendBtn, inputText.trim() ? styles.sendBtnActive : null]}
                onPress={handleSend}
                disabled={!inputText.trim() || isTyping}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={inputText.trim() ? '#fff' : COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <EmergencyButton />
    </View>
  );
}

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -8, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 150);
    const a3 = anim(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={styles.typingRow}>
      <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>AI</Text></View>
      <View style={styles.typingBubble}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { transform: [{ translateY: dot }] }]}
          />
        ))}
      </View>
    </View>
  );
}

function EmptyChat() {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyChat}>
      <Text style={styles.emptyChatEmoji}>🤜🤛</Text>
      <Text style={styles.emptyChatTitle}>
        {t('home.greeting_sub')}
      </Text>
      <Text style={styles.emptyChatSub}>
        {t('chat.placeholder')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  moodBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  moodBadgeText: { fontSize: 13, fontWeight: '700' },

  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 4, paddingVertical: 8,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modeBtnActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primary,
  },
  modeEmoji: { fontSize: 14 },
  modeLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  modeLabelActive: { color: COLORS.primary },

  messageList: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },

  messageRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4,
  },
  messageRowUser: { flexDirection: 'row-reverse' },
  aiBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary + '30',
    justifyContent: 'center', alignItems: 'center',
  },
  aiBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.primary },

  bubble: {
    maxWidth: '78%', padding: 12, borderRadius: 18,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    borderBottomRightRadius: 4,
  },
  aiBubble: { borderBottomLeftRadius: 4 },
  urgencyBubble: { borderColor: COLORS.danger, borderWidth: 2 },
  bubbleText: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22 },
  userBubbleText: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  userBubbleTime: { color: 'rgba(255,255,255,0.6)' },

  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  typingBubble: {
    flexDirection: 'row', gap: 4, padding: 14,
    backgroundColor: COLORS.card, borderRadius: 18,
    borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  typingDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: COLORS.textMuted,
  },

  urgencyBanner: {
    backgroundColor: COLORS.dangerGlow,
    borderTopWidth: 1, borderTopColor: COLORS.danger + '50',
    padding: 14, gap: 6,
  },
  urgencyText: { fontSize: 13, color: COLORS.textSecondary },
  urgencyCall: { fontSize: 14, fontWeight: '700', color: COLORS.danger },

  inputArea: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, paddingLeft: 16, paddingRight: 6, paddingVertical: 6,
  },
  input: {
    flex: 1, fontSize: 15, color: COLORS.textPrimary,
    maxHeight: 100, paddingVertical: 6,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnActive: { backgroundColor: COLORS.primary },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyChatEmoji: { fontSize: 48 },
  emptyChatTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  emptyChatSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
});