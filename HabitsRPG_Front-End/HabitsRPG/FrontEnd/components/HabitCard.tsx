import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function HabitCard({ habit, onAction }: any) {
  const isPositive = habit.type === "POSITIVE";

  // Definimos colores y textos según el tipo de hábito
  const cardColor = isPositive ? "#E8F5E9" : "#FFEBEE"; // Verde claro vs Rojo claro
  const btnColor = isPositive ? "#4CAF50" : "#E53935"; // Verde vs Rojo fuerte
  const btnText = isPositive ? "✅ Completar" : "😈 Caer";

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: cardColor, borderColor: btnColor },
      ]}
    >
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{habit.name}</Text>

        {/* Detalles de Recompensas/Costos */}
        <View style={styles.statsRow}>
          {isPositive ? (
            <>
              <Text style={styles.stat}>⭐ +{habit.xpReward} XP</Text>
              <Text style={styles.stat}>💰 +{habit.goldReward} G</Text>
              <Text style={styles.cost}>⚡ -{habit.energyCost} E</Text>
            </>
          ) : (
            <>
              <Text style={styles.stat}>⚡ +{habit.energyCost} E</Text>
              <Text style={styles.cost}>❤️ -{habit.hpPenalty} HP</Text>
            </>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: btnColor }]}
        onPress={() => onAction(habit.id)}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>{btnText}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 12,
    marginBottom: 12,
    padding: 15,
    borderLeftWidth: 5, // Una línea de color a la izquierda
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, // Sombra en Android
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stat: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
  },
  cost: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#D32F2F", // Rojo oscuro para los costos/daño
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginLeft: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});
