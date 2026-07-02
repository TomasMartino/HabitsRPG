import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MOOD_CONFIG: Record<string, { color: string; label: string }> = {
  HAPPY: { color: '#4CAF50', label: 'Feliz' },
  CONTENT: { color: '#81C784', label: 'Contento' },
  NEUTRAL: { color: '#9E9E9E', label: 'Neutral' },
  SAD: { color: '#42A5F5', label: 'Triste' },
  ANGRY: { color: '#E53935', label: 'Enojado' },
  DEPRESSED: { color: '#6A1B9A', label: 'Deprimido' },
};

interface PetMoodIndicatorProps {
  mood: string;
  size?: 'small' | 'large';
}

export default function PetMoodIndicator({ mood, size = 'small' }: PetMoodIndicatorProps) {
  const config = MOOD_CONFIG[mood] || MOOD_CONFIG.NEUTRAL;

  if (size === 'large') {
    return (
      <View style={styles.largeContainer}>
        <View style={[styles.largeDot, { backgroundColor: config.color, shadowColor: config.color }]} />
        <Text style={[styles.largeLabel, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.smallContainer}>
      <View style={[styles.smallDot, { backgroundColor: config.color }]} />
      <Text style={styles.smallLabel}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  smallContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  smallDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  smallLabel: {
    fontSize: 12,
    color: '#B0B0B0',
    fontWeight: '500',
  },
  largeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  largeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  largeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
