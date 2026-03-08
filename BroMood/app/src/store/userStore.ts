/**
 * userStore — user preferences, language, onboarding state
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type AppLanguage =
  | 'hinglish'
  | 'hindi'
  | 'english'
  | 'bengali'
  | 'kannada'
  | 'tamil'
  | 'marathi'
  | 'telugu';

export interface UserProfile {
  id: string;
  name: string;
  language: AppLanguage;
  onboardingCompleted: boolean;
  baselineSleepTime: string | null;
  keyboardEnabled: boolean;
  healthkitEnabled: boolean;
  cloudBackupEnabled: boolean;
  socialMediaHabit: 'none' | 'light' | 'moderate' | 'heavy';
}

interface UserStore extends UserProfile {
  setLanguage: (lang: AppLanguage) => Promise<void>;
  setName: (name: string) => void;
  completeOnboarding: () => Promise<void>;
  toggleKeyboard: () => void;
  toggleHealthkit: () => void;
  toggleCloudBackup: () => void;
  loadFromStorage: () => Promise<void>;
  setSocialMediaHabit: (habit: UserProfile['socialMediaHabit']) => void;
}

const STORAGE_KEY = 'bromood_user_profile';

export const useUserStore = create<UserStore>((set, get) => ({
  id: '',
  name: 'Bhai',
  language: 'hinglish',
  onboardingCompleted: false,
  baselineSleepTime: null,
  keyboardEnabled: false,
  healthkitEnabled: false,
  cloudBackupEnabled: false,
  socialMediaHabit: 'light',

  setLanguage: async (lang) => {
    set({ language: lang });
    const { default: i18n } = await import('../i18n');
    await i18n.changeLanguage(lang);
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(get()));
  },

  setName: (name) => set({ name }),

  completeOnboarding: async () => {
    set({ onboardingCompleted: true });
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(get()));
  },

  toggleKeyboard: () => set(s => ({ keyboardEnabled: !s.keyboardEnabled })),
  toggleHealthkit: () => set(s => ({ healthkitEnabled: !s.healthkitEnabled })),
  toggleCloudBackup: () => set(s => ({ cloudBackupEnabled: !s.cloudBackupEnabled })),
  setSocialMediaHabit: (habit) => set({ socialMediaHabit: habit }),

  loadFromStorage: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserProfile>;
        set(s => ({ ...s, ...parsed }));
      }
    } catch { /* first launch */ }
  },
}));
