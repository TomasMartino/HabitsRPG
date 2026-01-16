import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import StatBar from "@/components/StatBar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import PlayerAvatar from "@/components/PlayerAvatar";

// 🔧 CONFIGURACIÓN
// Usamos la URL base sin endpoints específicos para evitar errores 404
const BASE_URL = "http://192.168.1.36:8080/api";
const PLAYER_ID = 1;

export default function HomeScreen() {
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- 1. OBTENER DATOS (GET) ---
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/player/${PLAYER_ID}/stats`);
      setPlayer(response.data);
    } catch (error) {
      console.error("Error conectando al backend:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresco automático cada 10 seg
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // --- 2. ACCIONES (POST) ---

  const handleSleep = async () => {
    try {
      setLoading(true);
      await axios.post(`${BASE_URL}/player/${PLAYER_ID}/sleep`);
      await fetchStats();
      Alert.alert("💤 Descanso", "¡Salud y Energía restauradas al máximo!");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No pudiste dormir (Revisa la conexión)");
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPotion = async () => {
    if (!player) return;

    // Validación visual previa
    if (player.gold < 50) {
      Alert.alert("🚫 Fondos Insuficientes", "Necesitas 50 monedas de oro.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${BASE_URL}/player/${PLAYER_ID}/buy-potion`);
      await fetchStats();
      Alert.alert("🍷 Éxito", "¡Poción comprada! Has recuperado 20 HP.");
    } catch (error: any) {
      console.error(error);

      // Manejo de errores detallado
      if (error.response) {
        const serverMessage =
          typeof error.response.data === "string"
            ? error.response.data
            : JSON.stringify(error.response.data);
        Alert.alert("❌ Error del Servidor", serverMessage);
      } else {
        Alert.alert(
          "❌ Error de Conexión",
          "Revisa que el servidor Java esté corriendo."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // --- 3. RENDERIZADO ---

  if (loading && !player) {
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

      {/* SECCIÓN DE ORO Y TIENDA */}
      <View style={styles.goldContainer}>
        <View>
          <ThemedText style={styles.goldText}>
            💰 Oro: {player?.gold}
          </ThemedText>
          <ThemedText style={styles.goldText}>
            💀 Vidas: {player?.lives}
          </ThemedText>
        </View>

        <TouchableOpacity style={styles.shopButton} onPress={handleBuyPotion}>
          <Text style={styles.shopButtonText}>🍷 Comprar Poción</Text>
          {/* Corregí el texto: Una poción SUMA vida (+20 HP), no resta */}
          <Text style={styles.shopCostText}>$50 Oro (+20 HP)</Text>
        </TouchableOpacity>
      </View>

      {/* ACCIONES EXTRAS */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.sleepButton} onPress={handleSleep}>
          <Text style={styles.sleepText}>😴 Ir a Dormir (Restaurar)</Text>
        </TouchableOpacity>
      </View>
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
