/**
 * chatStore — chat state management for Bro_AI
 */

import { create } from 'zustand';
import { sendChatMessage, GeminiMessage, ChatResponse } from '../api/gemini';
import { insertChatMessage, getChatHistory, ChatMessage } from '../db/queries';
import { useUserStore } from './userStore';
import { useMoodStore } from './moodStore';

export type ChatMode = 'vent' | 'advice' | 'listen';

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  urgencyFlag?: boolean;
}

interface ChatStore {
  messages: UIMessage[];
  chatMode: ChatMode;
  isTyping: boolean;
  hasUrgency: boolean;

  setChatMode: (mode: ChatMode) => void;
  sendMessage: (content: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  chatMode: 'listen',
  isTyping: false,
  hasUrgency: false,

  setChatMode: (mode) => set({ chatMode: mode }),

  loadHistory: async () => {
    const history = await getChatHistory(100);
    const messages: UIMessage[] = history.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.sent_at,
      urgencyFlag: m.urgency_flag === 1,
    }));
    set({ messages });
  },

  clearHistory: async () => {
    const { clearChatHistory } = await import('../db/queries');
    await clearChatHistory();
    set({ messages: [] });
  },

  sendMessage: async (content: string) => {
    const { chatMode, messages } = get();
    const { language } = useUserStore.getState();
    const { currentSnapshot, lastDetectedThemes } = useMoodStore.getState();

    // Add user message immediately
    const userMsg: UIMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    set(s => ({ messages: [...s.messages, userMsg], isTyping: true }));

    // Persist user message
    await insertChatMessage({
      role: 'user',
      content,
      chat_mode: chatMode,
      urgency_flag: 0,
      sent_at: userMsg.timestamp,
    });

    try {
      // Build message history for API (last 10 messages for context)
      const apiMessages: GeminiMessage[] = messages
        .slice(-9)
        .concat(userMsg)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

      const response: ChatResponse = await sendChatMessage(apiMessages, {
        moodScore: currentSnapshot?.score ?? 5,
        themes: lastDetectedThemes,
        chatMode,
        language,
      });

      const assistantMsg: UIMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
        urgencyFlag: response.urgency_flag,
      };

      set(s => ({
        messages: [...s.messages, assistantMsg],
        isTyping: false,
        hasUrgency: response.urgency_flag,
      }));

      // Persist AI response
      await insertChatMessage({
        role: 'assistant',
        content: response.message,
        chat_mode: chatMode,
        urgency_flag: response.urgency_flag ? 1 : 0,
        sent_at: assistantMsg.timestamp,
      });

      // If urgency detected, update mood store
      if (response.urgency_flag) {
        useMoodStore.getState().updateJournalSentiment(1, ['self_harm'], true);
      }
    } catch (err) {
      const errorMsg: UIMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: language === 'english'
          ? "Yaar, connection issue hai. Try again? I'm here 💙"
          : 'Bhai, connection thoda weak lag raha hai. Dobara try kar? Main hoon 💙',
        timestamp: Date.now(),
      };
      set(s => ({ messages: [...s.messages, errorMsg], isTyping: false }));
    }
  },
}));
