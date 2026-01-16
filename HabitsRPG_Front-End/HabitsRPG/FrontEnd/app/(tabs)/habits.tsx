import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

// Componentes propios
import CreateHabitModal from "@/components/CreateHabitModal";
import HabitCard from "@/components/HabitCard";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

// 🔧 CONFIGURACIÓN
const API_URL = "http://192.168.1.36:8080/api";
const PLAYER_ID = 1;

export default function HabitsScreen() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // --- 1. CARGAR HÁBITOS (GET) ---
  const fetchHabits = async () => {
    try {
      const response = await axios.get(`${API_URL}/habits/player/${PLAYER_ID}`);
      setHabits(response.data);
    } catch (error) {
      console.error("Error cargando hábitos:", error);
      Alert.alert("Error", "No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHabits();
  }, []);

  // --- 2. COMPLETAR HÁBITO (POST) ---
  const handleAction = async (habitId: number) => {
    try {
      // Llamamos al endpoint
      const response = await axios.post(
        `${API_URL}/habits/${habitId}/complete/${PLAYER_ID}`
      );
      const updatedPlayer = response.data;

      // 👇👇 AQUÍ ESTÁ LA LÓGICA QUE FALTABA 👇👇

      // CASO A: GAME OVER (Muerto total)
      if (updatedPlayer.health === 0 && updatedPlayer.lives === 0) {
        Alert.alert(
          "💀 GAME OVER",
          "Te has quedado sin vidas. Tu personaje ha caído.\n\nVe a la pantalla de inicio y 'Duerme' para reiniciar."
        );
      }
      // CASO B: PERDIÓ UNA VIDA (Detectamos salud llena de golpe tras un daño)
      // Nota: Esta es una forma indirecta de saber si revivió
      else if (updatedPlayer.health === 100 && updatedPlayer.lives < 3) {
        // Asumiendo que 3 es el max
        Alert.alert(
          "💔 ¡Cuidado!",
          `Has perdido una vida. Te quedan: ${updatedPlayer.lives}`
        );
      }
      // CASO C: SOLO DAÑO O ÉXITO
      else {
        // Feedback corto para no molestar tanto
        // Alert.alert("¡Hecho!", "Progreso registrado.");
        // O puedes no poner nada si prefieres que sea rápido
      }
    } catch (error: any) {
      console.error(error);
      // Mensaje de error inteligente (ej: "No tienes energía")
      if (error.response && error.response.data) {
        Alert.alert("No se pudo completar", String(error.response.data));
      } else {
        Alert.alert("Error", "Ocurrió un error al conectar.");
      }
    }
  };

  // --- 3. CREAR NUEVO HÁBITO (POST) ---
  const handleCreateHabit = async (newHabitData: any) => {
    try {
      await axios.post(`${API_URL}/habits/player/${PLAYER_ID}`, newHabitData);
      fetchHabits(); // Recargar lista
      Alert.alert("Éxito", "Hábito creado correctamente");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo crear el hábito");
    }
  };

  // --- 4. RENDERIZADO ---
  if (loading) {
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
        renderItem={({ item }) => (
          <HabitCard habit={item} onAction={handleAction} />
        )}
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
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* MODAL DE CREACIÓN */}
      <CreateHabitModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={handleCreateHabit}
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
    paddingBottom: 80, // Espacio extra para que el botón no tape el último item
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: "#888",
    fontSize: 16,
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
