import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Streak tier colors as per spec
const TIER_COLORS: { min: number; max: number; bg: string; text: string; label: string }[] = [
  { min: 0, max: 0, bg: '#9E9E9E', text: '#FFFFFF', label: 'Ember' },
  { min: 1, max: 6, bg: '#CD7F32', text: '#FFFFFF', label: 'Spark' },
  { min: 7, max: 13, bg: '#C0C0C0', text: '#333333', label: 'Flame' },
  { min: 14, max: 29, bg: '#FFD700', text: '#333333', label: 'Blaze' },
  { min: 30, max: 59, bg: '#B9F2FF', text: '#1A237E', label: 'Inferno' },
  { min: 60, max: Infinity, bg: '#FF9800', text: '#FFFFFF', label: 'Legendary' },
];

function getStreakTier(streakCount: number) {
  return TIER_COLORS.find((t) => streakCount >= t.min && streakCount <= t.max) || TIER_COLORS[0];
}

interface StreakBadgeProps {
  streakCount: number;
  size?: 'small' | 'large';
}

export default function StreakBadge({ streakCount, size = 'small' }: StreakBadgeProps) {
  if (streakCount <= 0) return null;

  const tier = getStreakTier(streakCount);
  const showFire = streakCount >= 3;

  if (size === 'small') {
    return (
      <View style={[styles.smallBadge, { backgroundColor: tier.bg }]}>
        {showFire && <Text style={styles.smallFire}>🔥</Text>}
        <Text style={[styles.smallText, { color: tier.text }]}>
          {streakCount}d
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.largeBadge, { backgroundColor: tier.bg }]}>
      {showFire && <Text style={styles.largeFire}>🔥</Text>}
      <Text style={[styles.largeCount, { color: tier.text }]}>{streakCount}</Text>
      <Text style={[styles.largeLabel, { color: tier.text }]}>días</Text>
      <Text style={[styles.tierName, { color: tier.text }]}>{tier.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Small variant
  smallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  smallFire: {
    fontSize: 12,
  },
  smallText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Large variant
  largeBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 100,
  },
  largeFire: {
    fontSize: 28,
    marginBottom: 4,
  },
  largeCount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  largeLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
  },
  tierName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
    opacity: 0.8,
  },
});
