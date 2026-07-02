import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import StatBar from "@/components/StatBar";
import StreakBadge from "@/components/StreakBadge";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import PlayerAvatar from "@/components/PlayerAvatar";
import { usePlayerStore } from "@/stores/playerStore";
import { useStreakStore } from "@/stores/streakStore";

export default function HomeScreen() {
  const router = useRouter();
  const { player, isLoading, fetchPlayer, sleep } = usePlayerStore();
  const { streaks, fetchAllStreaks } = useStreakStore();

  // --- 1. OBTENER DATOS (GET) ---

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    await Promise.all([fetchPlayer(), fetchAllStreaks()]);
  };

  // --- 2. ACCIONES (POST) ---

  const handleSleep = async () => {
    const ok = await sleep();
    if (ok) {
      Alert.alert("💤 Descanso", "¡Salud y Energía restauradas al máximo!");
    } else {
      Alert.alert("Error", "No pudiste dormir (Revisa la conexión)");
    }
  };

  // --- 3. RENDERIZADO ---

  if (isLoading && !player) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 10, color: "#666" }}>
          Cargando personaje...
        </Text>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <ThemedText type="title">
            {player?.health === 0 && player?.lives === 0 ? "💀" : "🛡️"}{" "}
            {player?.name}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.levelText}>
            Nivel {player?.level}
          </ThemedText>
        </View>
        {/* 👇 AQUÍ VA TU NUEVO AVATAR DINÁMICO 👇 */}
        <PlayerAvatar health={player?.health || 0} lives={player?.lives || 0} />

        {/* BARRAS DE ESTADÍSTICAS */}
        <View style={styles.statsContainer}>
          <StatBar
            label="Salud"
            value={player?.health || 0}
            maxValue={100}
            color="#F44336"
            icon="❤️"
          />
          <StatBar
            label="Energía"
            value={player?.energy || 0}
            maxValue={100}
            color="#FFC107"
            icon="⚡"
          />
          <StatBar
            label={`Nivel ${player?.level || 1}`}
            value={player?.xp || 0}
            maxValue={player?.xpToNextLevel || 100}
            color="#2196F3"
            icon="⭐"
          />
        </View>

        {/* SECCIÓN DE MONEDAS Y TIENDA */}
        <View style={styles.goldContainer}>
          <View>
            <ThemedText style={styles.goldText}>
              💰 Oro: {player?.gold}
            </ThemedText>
            <ThemedText style={styles.goldText}>
              💎 Gemas: {player?.gems ?? 0}
            </ThemedText>
            <ThemedText style={styles.goldText}>
              💀 Vidas: {player?.lives}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/(tabs)/shop' as any)}
          >
            <Text style={styles.shopButtonText}>🏪 Ir a la Tienda</Text>
            <Text style={styles.shopCostText}>Compra objetos y mejoras</Text>
          </TouchableOpacity>
        </View>

        {/* SECCIÓN DE RACHAS DESTACADAS */}
        {streaks.filter((s) => s.currentStreak > 0).length > 0 && (
          <View style={styles.streakSection}>
            <ThemedText style={styles.streakSectionTitle}>
              🔥 Rachas Activas
            </ThemedText>
            {streaks
              .filter((s) => s.currentStreak > 0)
              .sort((a, b) => b.currentStreak - a.currentStreak)
              .slice(0, 5)
              .map((s) => (
                <View key={s.habitId} style={styles.streakRow}>
                  <Text style={styles.streakHabitName} numberOfLines={1}>
                    {s.habitName}
                  </Text>
                  <View style={styles.streakRight}>
                    <Text style={styles.streakMultiplier}>
                      {s.multiplier.toFixed(1)}x
                    </Text>
                    <StreakBadge streakCount={s.currentStreak} size="small" />
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* ACCIONES EXTRAS */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.sleepButton} onPress={handleSleep}>
            <Text style={styles.sleepText}>😴 Ir a Dormir (Restaurar)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

// --- 4. ESTILOS ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  levelText: {
    color: "#888",
  },
  statsContainer: {
    gap: 20,
  },
  goldContainer: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF8E1",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#FFD54F",
  },
  goldText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#5D4037",
  },
  shopButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  shopButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  shopCostText: {
    color: "#E8F5E9",
    fontSize: 10,
  },
  streakSection: {
    marginTop: 24,
    backgroundColor: '#1A1A2E',
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  streakSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
  },
  streakHabitName: {
    flex: 1,
    fontSize: 15,
    color: '#E0E0E0',
    marginRight: 10,
    fontWeight: '500',
  },
  streakRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakMultiplier: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'bold',
    backgroundColor: '#2A2A3E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  actionContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  sleepButton: {
    backgroundColor: "#3F51B5",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
  },
  sleepText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
