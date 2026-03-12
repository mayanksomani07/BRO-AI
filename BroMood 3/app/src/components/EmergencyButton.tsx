import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Animated, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '../constants/theme';
import { useMoodStore } from '../store/moodStore';

interface EmergencyButtonProps {
  onPress: () => void;
}

export default function EmergencyButton(props: EmergencyButtonProps) {
  const { onPress } = props;
  const insets = useSafeAreaInsets();
  const { currentSnapshot } = useMoodStore();
  const score = currentSnapshot?.score ?? 5;
  const isCritical = score < 3;
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isCritical) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.5, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      Animated.timing(pulse, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
    return () => { loopRef.current?.stop(); };
  }, [isCritical]);

  const bottom = insets.bottom + 78 + 14;

  return (
    <View style={[styles.wrapper, { bottom }]} pointerEvents="box-none">
      {isCritical && (
        <Animated.View style={[styles.glow, { transform: [{ scale: pulse }] }]} />
      )}
      <TouchableOpacity
        style={[styles.fab, isCritical && styles.fabCritical]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Ionicons name="call" size={15} color="#fff" />
        <Text style={styles.label}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.danger + '35',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.danger,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  fabCritical: {
    shadowOpacity: 0.8,
    shadowRadius: 16,
  },
  label: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});