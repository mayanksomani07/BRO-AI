import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetch } from 'expo/fetch';
import { useMood } from '@/lib/mood-context';
import { useLanguage } from '@/lib/language-context';
import { getBroAISystemPrompt } from '@/lib/hinglish-messages';
import colors from '@/constants/colors';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const CHAT_KEY = '@moodguard_broai_chat';
const API_BASE = Platform.OS === 'web'
  ? `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}//${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:5000`
  : process.env.EXPO_PUBLIC_API_URL || 'https://localhost:5000';

function getApiUrl(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const port = '5000';
      return `${window.location.protocol}//${window.location.hostname}:${port}`;
    }
    return 'http://localhost:5000';
  }
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="heart-circle" size={28} color={colors.primary} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{message.content}</Text>
      </View>
    </View>
  );
}

export default function BroAIScreen() {
  const insets = useSafeAreaInsets();
  const { moods } = useMood();
  const { language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(CHAT_KEY);
      if (saved) setMessages(JSON.parse(saved));
    })();
  }, []);

  const saveMessages = useCallback(async (msgs: ChatMessage[]) => {
    const toSave = msgs.slice(-50);
    await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(toSave));
  }, []);

  const clearChat = useCallback(async () => {
    setMessages([]);
    await AsyncStorage.removeItem(CHAT_KEY);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = {
      id: Crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const currentMood = moods.length > 0 ? moods[0].mood : undefined;
    const systemPrompt = getBroAISystemPrompt(language, currentMood);

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    const assistantId = Crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, assistantMsg]);

    try {
      const apiMessages = updatedMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/broai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, systemPrompt }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setMessages(prev =>
                  prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m)
                );
              }
              if (data.done) break;
            } catch {}
          }
        }
      }

      const finalMessages = updatedMessages.concat([{ ...assistantMsg, content: fullContent }]);
      await saveMessages(finalMessages);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Sorry bhai, kuch technical issue ho gaya. Thodi der baad try karna.' }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, moods, language, saveMessages]);

  const renderItem = useCallback(({ item }: { item: ChatMessage }) => (
    <MessageBubble message={item} />
  ), []);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const greetings: Record<string, string> = {
    hinglish: "Hey bhai! Main BroAI hoon — tera apna wellness buddy. Bata, kya chal raha hai?",
    hindi: "नमस्ते! मैं BroAI हूँ — आपका अपना वेलनेस बडी। बताइए, कैसा महसूस कर रहे हैं?",
    english: "Hey! I'm BroAI — your personal wellness buddy. Tell me, how are you feeling today?",
    bengali: "হ্যালো! আমি BroAI — তোমার নিজের ওয়েলনেস বাডি। বলো, কেমন আছো?",
    kannada: "ಹೇ! ನಾನು BroAI — ನಿಮ್ಮ ವೆಲ್‌ನೆಸ್ ಬಡ್ಡಿ. ಹೇಗಿದ್ದೀರಿ?",
    tamil: "ஹாய்! நான் BroAI — உங்கள் வெல்னெஸ் பட்டி. எப்படி இருக்கீங்க?",
    telugu: "హాయ్! నేను BroAI — మీ వెల్‌నెస్ బడ్డీ. ఎలా ఉన్నారు?",
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + webTopInset }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Ionicons name="heart-circle" size={32} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>BroAI</Text>
            <Text style={styles.headerStatus}>Always here for you</Text>
          </View>
        </View>
        <Pressable onPress={clearChat} hitSlop={12}>
          <Ionicons name="trash-outline" size={20} color={colors.textTertiary} />
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        scrollEnabled={!!messages.length}
        ListEmptyComponent={
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeAvatar}>
              <Ionicons name="heart-circle" size={56} color={colors.primary} />
            </View>
            <Text style={styles.welcomeText}>
              {greetings[language] || greetings.hinglish}
            </Text>
            <View style={styles.suggestionsContainer}>
              {[
                language === 'hinglish' ? 'Aaj mood thoda low hai' : 'Feeling a bit low today',
                language === 'hinglish' ? 'Kuch stress ho raha hai' : 'I\'m feeling stressed',
                language === 'hinglish' ? 'Neend nahi aa rahi' : 'Can\'t sleep',
              ].map((suggestion, i) => (
                <Pressable
                  key={i}
                  onPress={() => { setInput(suggestion); }}
                  style={({ pressed }) => [styles.suggestion, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
      />

      {isStreaming && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.typingText}>BroAI is typing...</Text>
        </View>
      )}

      <View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'web' ? 34 + 8 : Math.max(insets.bottom, 8) }]}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={language === 'hinglish' ? 'Apna dil ki baat bata...' : 'Share what\'s on your mind...'}
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            editable={!isStreaming}
          />
          <Pressable
            onPress={sendMessage}
            disabled={!input.trim() || isStreaming}
            style={({ pressed }) => [
              styles.sendBtn,
              { opacity: (!input.trim() || isStreaming) ? 0.4 : pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  headerStatus: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.success,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    flexGrow: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '85%',
  },
  bubbleRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '90%',
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  welcomeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  suggestionsContainer: {
    gap: 10,
    width: '100%',
  },
  suggestion: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  suggestionText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.primary,
    textAlign: 'center',
  },
});
