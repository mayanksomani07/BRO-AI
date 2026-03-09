import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/theme';

export default function EmergencyButton() {
  const navigation = useNavigation<any>();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse }] }]} />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Emergency')}
        activeOpacity={0.85}
      >
        <Ionicons name="call" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute', bottom: 100, right: 20,
    width: 52, height: 52, justifyContent: 'center', alignItems: 'center',
    zIndex: 999,
  },
  pulseRing: {
    position: 'absolute',
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.danger + '30',
  },
  fab: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.danger,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
});
