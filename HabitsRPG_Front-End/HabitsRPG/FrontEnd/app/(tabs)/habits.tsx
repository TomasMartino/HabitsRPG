import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

// Componentes propios
import CreateHabitModal from "@/components/CreateHabitModal";
import HabitCard from "@/components/HabitCard";
import HabitDetailModal from "@/components/HabitDetailModal";
import StreakBadge from "@/components/StreakBadge";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useHabitStore } from "@/stores/habitStore";
import { usePlayerStore } from "@/stores/playerStore";
import { useStreakStore } from "@/stores/streakStore";

export default function HabitsScreen() {
  const { habits, isLoading: habitsLoading, fetchHabits, createHabit, completeHabit } =
    useHabitStore();
  const { fetchPlayer } = usePlayerStore();
  const { habitStreaks, fetchAllStreaks } = useStreakStore();
  const [refreshing, setRefreshing] = useState(false);

  // Estados para los Modales
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<any>(null);

  // --- 1. CARGAR HÁBITOS + RACHAS (GET) ---

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([fetchHabits(), fetchAllStreaks()]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // --- 2. COMPLETAR HÁBITO (POST) ---
  // Esta función se ejecuta CUANDO le das a "Misión Cumplida" dentro del Modal
  const handleCompleteHabit = async (habitId: number) => {
    try {
      const updatedPlayer = await completeHabit(habitId);

      // Lógica de Feedback RPG
      if (updatedPlayer.health === 0 && updatedPlayer.lives === 0) {
        Alert.alert(
          "💀 GAME OVER",
          "Te has quedado sin vidas. Tu personaje ha caído.\n\nVe a la pantalla de inicio y 'Duerme' para reiniciar.",
        );
      } else if (updatedPlayer.health === 100 && updatedPlayer.lives < 3) {
        Alert.alert(
          "💔 ¡Cuidado!",
          `Has perdido una vida. Te quedan: ${updatedPlayer.lives}`,
        );
      }

      // Refrescar datos del jugador después de completar hábito
      fetchPlayer();
      // 3. IMPORTANTE: Cerramos el modal de detalle después de completar
      setSelectedHabit(null);
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      if (status === 409) {
        Alert.alert("🕐 Ya completado", "Ya completaste este hábito hoy. ¡Vuelve mañana!");
      } else if (data?.message) {
        Alert.alert("No se pudo completar", data.message);
      } else if (data?.error) {
        Alert.alert("No se pudo completar", data.error);
      } else {
        Alert.alert("Error", "Ocurrió un error al conectar.");
      }
    }
  };

  // --- 3. CREAR NUEVO HÁBITO (POST) ---
  const handleCreateHabit = async (newHabitData: any) => {
    const ok = await createHabit(newHabitData);
    if (ok) {
      Alert.alert("Éxito", "Hábito creado correctamente");
    } else {
      Alert.alert("Error", "No se pudo crear el hábito");
    }
  };

  // --- 4. RENDERIZADO ---
  if (habitsLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.headerTitle}>
        Mis Hábitos
      </ThemedText>

      <FlatList
        data={habits}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={({ item }) => {
          const streak = habitStreaks.get(item.id);
          const streakCount = streak?.currentStreak ?? 0;
          return (
            <View>
              <View style={styles.cardRow}>
                <HabitCard
                  habit={item}
                  onAction={() => setSelectedHabit(item)}
                />
                {streakCount > 0 && (
                  <StreakBadge streakCount={streakCount} size="small" />
                )}
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <ThemedText style={styles.emptyText}>
            No tienes hábitos asignados aún.
          </ThemedText>
        }
      />

      {/* BOTÓN FLOTANTE (+) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* MODAL 1: CREAR HÁBITO */}
      <CreateHabitModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={handleCreateHabit}
      />

      {/* MODAL 2: DETALLE DE MISIÓN (NUEVO) */}
      <HabitDetailModal
        visible={!!selectedHabit} // Se muestra si hay un hábito seleccionado
        habit={selectedHabit}
        onClose={() => setSelectedHabit(null)}
        onComplete={(habit: any) => handleCompleteHabit(habit.id)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 28,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: "#888",
    fontSize: 16,
  },
  cardRow: {
    position: 'relative',
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#2196F3",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
