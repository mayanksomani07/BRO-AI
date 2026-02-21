import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Dimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { MOTIVATIONAL_MESSAGES } from '@/lib/mood-analyzer';
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

function AffirmationCard({ item, index }: { item: typeof MOTIVATIONAL_MESSAGES[0]; index: number }) {
  const heartScale = useSharedValue(1);
  const [liked, setLiked] = useState(false);
  const gradientColors = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handleLike = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setLiked(!liked);
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 6 }),
      withSpring(1),
    );
  };

  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={gradientColors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardDecoration}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
        </View>

        <View style={styles.cardContent}>
          <Ionicons name="sparkles" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMessage}>{item.message}</Text>

          <Pressable onPress={handleLike} style={styles.likeBtn}>
            <Animated.View style={heartStyle}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={24}
                color={liked ? '#F87171' : 'rgba(255,255,255,0.6)'}
              />
            </Animated.View>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

export default function AffirmationsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const renderItem = useCallback(({ item, index }: { item: typeof MOTIVATIONAL_MESSAGES[0]; index: number }) => (
    <AffirmationCard item={item} index={index} />
  ), []);

  const keyExtractor = useCallback((_: any, index: number) => index.toString(), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Affirmations</Text>
        <Text style={styles.subtitle}>Words of encouragement for you</Text>
      </View>

      <FlatList
        data={MOTIVATIONAL_MESSAGES}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
      />
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
  listContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    minHeight: 180,
    justifyContent: 'center',
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardContent: {
    gap: 12,
    zIndex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  cardMessage: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 23,
  },
  likeBtn: {
    alignSelf: 'flex-end',
    marginTop: 4,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
