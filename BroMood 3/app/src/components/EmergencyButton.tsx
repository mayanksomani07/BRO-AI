/**
 * EmergencyButton — cleaner SOS button
 * Positioned above bottom tab bar, left side to avoid conflicts
 */
import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Animated, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS } from '../constants/theme';
import { useMoodStore } from '../store/moodStore';

export default function EmergencyButton() {
  const navigation = useNavigation<any>();
  const { currentSnapshot } = useMoodStore();
  const score = currentSnapshot?.score ?? 5;
  const pulse = useRef(new Animated.Value(1)).current;
  const isCritical = score < 3;

  useEffect(() => {
    // Only pulse when mood is critical
    if (isCritical) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.2, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [isCritical]);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Pulse ring — only visible when critical */}
      {isCritical && (
        <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse }] }]} />
      )}
      <TouchableOpacity
        style={[styles.fab, isCritical && styles.fabCritical]}
        onPress={() => navigation.navigate('Emergency')}
        activeOpacity={0.85}
      >
        <Ionicons name="call" size={18} color="#fff" />
        <Text style={styles.fabLabel}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 96,     // sits just above bottom tab bar
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 998,
  },
  pulseRing: {
    position: 'absolute',
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.danger + '35',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.danger,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
  fabCritical: {
    backgroundColor: COLORS.danger,
    shadowOpacity: 0.65,
  },
  fabLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});