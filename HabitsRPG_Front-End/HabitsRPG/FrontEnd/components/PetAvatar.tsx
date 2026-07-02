import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet, ActivityIndicator } from 'react-native';
import PetMoodIndicator from './PetMoodIndicator';
import type { ActivePet } from '@/stores/petStore';

const SPECIES_EMOJI: Record<string, string> = {
  'Fénix': '🦅',
  'Gato Sombrío': '🐱',
  'Dragón Dorado': '🐉',
  'Slime': '🟢',
};

const DEFAULT_SPECIES = '🐾';

const MOOD_EMOJI: Record<string, string> = {
  HAPPY: '😄',
  CONTENT: '🙂',
  NEUTRAL: '😐',
  SAD: '😢',
  ANGRY: '😠',
  DEPRESSED: '😞',
};

const AFFECTION_MAX = 500;

function getAffectionColor(affection: number): string {
  const ratio = Math.min(affection / AFFECTION_MAX, 1);
  // Red (#F44336) → Yellow (#FFC107) → Gold (#FFD700)
  const r = Math.round(244 + (255 - 244) * ratio);
  const g = Math.round(67 + (193 - 67) * ratio);
  const b = Math.round(54 + (7 - 54) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

interface PetAvatarProps {
  activePet: ActivePet | null;
  loading: boolean;
}

export default function PetAvatar({ activePet, loading }: PetAvatarProps) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  // No active pet
  if (!loading && !activePet) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>🐾</Text>
        <Text style={styles.emptyText}>
          No tienes una mascota activa. {'\n'}¡Compra una en la tienda!
        </Text>
      </View>
    );
  }

  // Loading
  if (loading && !activePet) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  // Pet exists
  const speciesEmoji = SPECIES_EMOJI[activePet!.petName] || DEFAULT_SPECIES;
  const moodEmoji = MOOD_EMOJI[activePet!.mood] || '🐾';
  const affectionPct = Math.min((activePet!.affection / AFFECTION_MAX) * 100, 100);
  const barColor = getAffectionColor(activePet!.affection);

  return (
    <View style={styles.card}>
      {/* Name + Mood badge row */}
      <View style={styles.headerRow}>
        <Text style={styles.petName}>{activePet!.petName}</Text>
        <PetMoodIndicator mood={activePet!.mood} size="small" />
      </View>

      {/* Floating species emoji (main pet image) */}
      <Animated.View style={[styles.emojiContainer, { transform: [{ translateY }] }]}>
        <Text style={styles.emoji}>{speciesEmoji}</Text>
        {activePet!.mood !== 'NEUTRAL' && (
          <Text style={styles.moodOverlay}>{moodEmoji}</Text>
        )}
      </Animated.View>

      {/* Affection bar */}
      <View style={styles.affectionSection}>
        <View style={styles.affectionLabelRow}>
          <Text style={styles.affectionLabel}>Afecto</Text>
          <Text style={styles.affectionValue}>
            {activePet!.affection} / {AFFECTION_MAX}
          </Text>
        </View>
        <View style={styles.affectionBarBg}>
          <View style={[styles.affectionBarFill, { width: `${affectionPct}%`, backgroundColor: barColor }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  petName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E0E0E0',
  },
  emojiContainer: {
    marginVertical: 8,
    position: 'relative',
  },
  emoji: {
    fontSize: 64,
  },
  moodOverlay: {
    fontSize: 20,
    position: 'absolute',
    bottom: -4,
    right: -8,
  },
  affectionSection: {
    width: '100%',
    marginTop: 8,
  },
  affectionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  affectionLabel: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '600',
  },
  affectionValue: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  affectionBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#2A2A4E',
    borderRadius: 4,
    overflow: 'hidden',
  },
  affectionBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
