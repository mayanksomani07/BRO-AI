/**
 * App.tsx — BroMood root
 *
 * KEY ARCHITECTURE:
 *   1. NavigationContainer is ALWAYS mounted from frame 1. Never conditional.
 *   2. ALL screens declared statically. No conditional screen lists.
 *   3. App always starts on "Splash" (plain spinner, zero hooks).
 *   4. After DB + store init, we call navRef.reset() to go to real first screen.
 *   5. sessionStart() called only after DB is ready.
 *
 * This is the ONLY architecture that survives Expo Go Fast Refresh.
 */

import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import './src/i18n';
import { initDatabase }  from './src/db/schema';
import { useUserStore }  from './src/store/userStore';
import { useMoodStore, sessionStart } from './src/store/moodStore';
import { TriggerEngine } from './src/engine/TriggerEngine';
import { COLORS }        from './src/constants/theme';

import HomeScreen      from './src/screens/Home/HomeScreen';
import ChatScreen      from './src/screens/Chat/ChatScreen';
import MusicScreen     from './src/screens/Music/MusicScreen';
import TherapistScreen from './src/screens/Therapist/TherapistScreen';
import MoreScreen      from './src/screens/More/Morescreen';
import TasksScreen     from './src/screens/Tasks/TasksScreen';
import JournalScreen   from './src/screens/Journal/JournalScreen';
import SettingsScreen  from './src/screens/Settings/SettingsScreen';
import EmergencyScreen from './src/screens/Emergency/EmergencyScreen';

import LanguageSelectScreen from './src/screens/Onboarding/LanguageSelect';
import ConsentScreen        from './src/screens/Onboarding/ConsentScreen';
import BaselineSetupScreen  from './src/screens/Onboarding/BaselineSetup';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
type IonName = keyof typeof Ionicons.glyphMap;

// ─── Splash — zero hooks, zero navigation calls ───────────────────────────────
function SplashScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
const TABS: Array<{
  name: string; comp: React.ComponentType<any>;
  icon: IonName; iconOn: IonName; label: string;
}> = [
  { name: 'Home',      comp: HomeScreen,      icon: 'home-outline',          iconOn: 'home',          label: 'Home'      },
  { name: 'Bro_AI',   comp: ChatScreen,      icon: 'chatbubble-outline',    iconOn: 'chatbubble',    label: 'Bro AI'    },
  { name: 'Music',     comp: MusicScreen,     icon: 'musical-notes-outline', iconOn: 'musical-notes', label: 'Music'     },
  { name: 'Therapist', comp: TherapistScreen, icon: 'people-outline',        iconOn: 'people',        label: 'Therapist' },
  { name: 'More',      comp: MoreScreen,      icon: 'menu-outline',          iconOn: 'menu',          label: 'More'      },
];

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find(t => t.name === route.name);
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: 78, paddingBottom: 16, paddingTop: 8,
          },
          tabBarActiveTintColor:   COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarLabelStyle: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3, marginTop: 1 },
          tabBarLabel: tab?.label ?? route.name,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? (tab?.iconOn ?? 'ellipse') : (tab?.icon ?? 'ellipse-outline')}
              size={22} color={color}
            />
          ),
        };
      }}
    >
      {TABS.map(t => <Tab.Screen key={t.name} name={t.name} component={t.comp} />)}
    </Tab.Navigator>
  );
}

// ─── Root stack — static, never changes shape ─────────────────────────────────
function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Stack.Screen name="Splash"         component={SplashScreen} />
      <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
      <Stack.Screen name="Consent"        component={ConsentScreen} />
      <Stack.Screen name="BaselineSetup"  component={BaselineSetupScreen} />
      <Stack.Screen name="Main"           component={MainTabs} />
      <Stack.Screen name="Tasks"          component={TasksScreen} />
      <Stack.Screen name="Journal"        component={JournalScreen} />
      <Stack.Screen name="Settings"       component={SettingsScreen} />
      <Stack.Screen name="Emergency"      component={EmergencyScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const navRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await initDatabase();
        await useUserStore.getState().loadFromStorage();
        await useMoodStore.getState().recalculateMoodScore();
        sessionStart();                              // safe now — DB is ready
        TriggerEngine.startBackgroundEvaluation();
      } catch (e) {
        console.warn('BroMood init error:', e);
      }

      if (cancelled) return;

      // Poll until NavigationContainer is ready, then navigate away from Splash
      const doNavigate = () => {
        if (!navRef.current?.isReady()) {
          setTimeout(doNavigate, 30);
          return;
        }
        const done = useUserStore.getState().onboardingCompleted;
        navRef.current.reset({
          index: 0,
          routes: [{ name: done ? 'Main' : 'LanguageSelect' }],
        });
      };
      doNavigate();
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <SafeAreaProvider>
        {/* NavigationContainer mounted ONCE, never torn down */}
        <NavigationContainer ref={navRef}>
          <StatusBar style="light" />
          <RootStack />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}