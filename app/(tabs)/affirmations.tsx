import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { MOTIVATIONAL_MESSAGES } from '@/lib/mood-analyzer';
import { useLanguage } from '@/lib/language-context';
import colors from '@/constants/colors';

const { width } = Dimensions.get('window');

const GRADIENT_PAIRS = [
  ['#0D9488', '#134E4A'],
  ['#3B82F6', '#1E40AF'],
  ['#8B5CF6', '#5B21B6'],
  ['#F59E0B', '#D97706'],
  ['#10B981', '#047857'],
  ['#EC4899', '#BE185D'],
  ['#F97316', '#C2410C'],
  ['#06B6D4', '#0E7490'],
  ['#6366F1', '#4338CA'],
  ['#14B8A6', '#0F766E'],
  ['#EF4444', '#B91C1C'],
  ['#84CC16', '#4D7C0F'],
];

export default function AffirmationsScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const cardScale = useSharedValue(1);
  const heartScale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const shuffledMessages = useMemo(() => {
    const today = new Date().toDateString();
    let seed = 0;
    for (let i = 0; i < today.length; i++) seed += today.charCodeAt(i);
    return [...MOTIVATIONAL_MESSAGES].sort((a, b) => {
      const ha = (seed * a.title.charCodeAt(0)) % 100;
      const hb = (seed * b.title.charCodeAt(0)) % 100;
      return ha - hb;
    });
  }, []);

  const currentMessage = shuffledMessages[currentIndex];
  const gradientColors = GRADIENT_PAIRS[currentIndex % GRADIENT_PAIRS.length];

  const handleShuffle = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cardScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 8 }),
    );
    setCurrentIndex((prev) => (prev + 1) % shuffledMessages.length);
    setLiked(false);
  };

  const handleLike = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLiked(!liked);
    heartScale.value = withSequence(
      withSpring(1.5, { damping: 6 }),
      withSpring(1),
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {language === 'hinglish' ? 'Daily Motivation' : 'Daily Motivation'}
        </Text>
        <Text style={styles.subtitle}>
          {language === 'hinglish'
            ? 'Aaj ki dose of positivity'
            : 'Your daily dose of positivity'}
        </Text>
      </View>

      <View style={styles.cardContainer}>
        <Animated.View style={[styles.cardWrapper, cardStyle]}>
          <LinearGradient
            colors={gradientColors as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardDecoration}>
              <View style={styles.circle1} />
              <View style={styles.circle2} />
              <View style={styles.circle3} />
            </View>

            <View style={styles.cardContent}>
              <Ionicons name="sparkles" size={28} color="rgba(255,255,255,0.7)" />
              <Text style={styles.cardTitle}>{currentMessage.title}</Text>
              <Text style={styles.cardMessage}>{currentMessage.message}</Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.cardCounter}>
                {currentIndex + 1} / {shuffledMessages.length}
              </Text>
              <Pressable onPress={handleLike} style={styles.likeBtn}>
                <Animated.View style={heartStyle}>
                  <Ionicons
                    name={liked ? 'heart' : 'heart-outline'}
                    size={28}
                    color={liked ? '#F87171' : 'rgba(255,255,255,0.6)'}
                  />
                </Animated.View>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>

      <View style={[styles.actions, { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }]}>
        <Pressable
          onPress={handleShuffle}
          style={({ pressed }) => [styles.shuffleBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="shuffle" size={22} color="#FFFFFF" />
          <Text style={styles.shuffleBtnText}>
            {language === 'hinglish' ? 'Agla Card' : 'Next Card'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
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
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    borderRadius: 24,
    padding: 28,
    minHeight: 280,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  cardDecoration: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  circle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circle3: {
    position: 'absolute',
    top: '40%',
    left: '60%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cardContent: {
    gap: 16,
    zIndex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  cardMessage: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 24,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    zIndex: 1,
  },
  cardCounter: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
  },
  likeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
  },
  shuffleBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});
