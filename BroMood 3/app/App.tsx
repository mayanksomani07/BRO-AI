import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import 'intl-pluralrules'; 
import './src/i18n';
import { initDatabase } from './src/db/schema';
import { useUserStore } from './src/store/userStore';
import { useMoodStore } from './src/store/moodStore';
import { TriggerEngine } from './src/engine/TriggerEngine';
import { COLORS } from './src/constants/theme';

// Screens
import HomeScreen from './src/screens/Home/HomeScreen';
import ChatScreen from './src/screens/Chat/ChatScreen';
import JournalScreen from './src/screens/Journal/JournalScreen';
import TasksScreen from './src/screens/Tasks/TasksScreen';
import SettingsScreen from './src/screens/Settings/SettingsScreen';
import LanguageSelectScreen from './src/screens/Onboarding/LanguageSelect';
import ConsentScreen from './src/screens/Onboarding/ConsentScreen';
import BaselineSetupScreen from './src/screens/Onboarding/BaselineSetup';
import EmergencyScreen from './src/screens/Emergency/EmergencyScreen';
import MusicScreen from './src/screens/Music/MusicScreen';
import TherapistScreen from './src/screens/Therapist/TherapistScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 88,
          paddingBottom: 24,
          paddingTop: 10,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: focused ? 'home' : 'home-outline',
            Chat: focused ? 'chatbubble' : 'chatbubble-outline',
            Journal: focused ? 'book' : 'book-outline',
            Tasks: focused ? 'checkbox' : 'checkbox-outline',
            Settings: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: 'Bro_AI' }} />
      <Tab.Screen name="Journal" component={JournalScreen} options={{ tabBarLabel: 'Journal' }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ tabBarLabel: 'Tasks' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { onboardingCompleted } = useUserStore();
  const { recalculateMoodScore } = useMoodStore();

  useEffect(() => {
    const initialize = async () => {
      await initDatabase();
      await recalculateMoodScore();
      TriggerEngine.startBackgroundEvaluation();
    };
    initialize();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!onboardingCompleted ? (
              <>
                <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
                <Stack.Screen name="Consent" component={ConsentScreen} />
                <Stack.Screen name="BaselineSetup" component={BaselineSetupScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="Music" component={MusicScreen} />
                <Stack.Screen name="Therapist" component={TherapistScreen} />
                <Stack.Screen
                  name="Emergency"
                  component={EmergencyScreen}
                  options={{ presentation: 'modal' }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
});
