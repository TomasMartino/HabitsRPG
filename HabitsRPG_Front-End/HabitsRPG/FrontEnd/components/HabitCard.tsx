import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons"; // Usamos esto para la flechita

export default function HabitCard({ habit, onAction }: any) {
  const isPositive = habit.type === "POSITIVE";

  // Colores dinámicos
  const cardBackgroundColor = isPositive ? "#E8F5E9" : "#FFEBEE"; // Verde claro vs Rojo claro
  const accentColor = isPositive ? "#4CAF50" : "#E53935"; // Verde fuerte vs Rojo fuerte

  // Soporte para datos viejos (name) y nuevos (title)
  const displayTitle = habit.title || habit.name || "Misión Desconocida";

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: cardBackgroundColor, borderColor: accentColor },
      ]}
      onPress={() => onAction(habit.id)}
      activeOpacity={0.7}
    >
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{displayTitle}</Text>

        {/* Detalles de Recompensas/Costos */}
        <View style={styles.statsRow}>
          {isPositive ? (
            <>
              <Text style={styles.stat}>⭐ {habit.xpReward} XP</Text>
              <Text style={styles.stat}>💰 {habit.goldReward} Oro</Text>
              <Text style={styles.cost}>⚡ -{habit.energyCost} E</Text>
            </>
          ) : (
            <>
              <Text style={styles.stat}>⚡ +{habit.energyCost} E</Text>
              <Text style={[styles.cost, { color: "#D32F2F" }]}>
                ❤️ -{habit.hpPenalty} HP
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Flecha indicadora en lugar de botón de texto */}
      <Ionicons name="chevron-forward" size={24} color={accentColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 12,
    marginBottom: 12,
    padding: 15,
    borderLeftWidth: 6, // Línea de color a la izquierda más visible
    alignItems: "center",
    // Sombras suaves
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  infoContainer: {
    flex: 1, // Ocupa todo el espacio menos la flecha
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12, // Espacio entre items
  },
  stat: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  cost: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#444",
  },
});
