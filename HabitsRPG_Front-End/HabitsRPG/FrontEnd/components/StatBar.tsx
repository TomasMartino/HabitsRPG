import React from "react";
import { View, Text, StyleSheet } from "react-native";

// Agregamos maxValue a las props (por defecto 100 si no se pasa nada)
export default function StatBar({
  label,
  value,
  maxValue = 100,
  color,
  icon,
}: any) {
  // 1. Calculamos el porcentaje real (Regla de 3 simple)
  // Math.min(100, ...) asegura que la barra nunca supere el 100% de ancho visualmente
  const percentage = Math.max(0, Math.min(100, (value / maxValue) * 100));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.labelText}>
          {icon} {label}
        </Text>
        {/* 2. Mostramos el valor real sobre el máximo real */}
        <Text style={styles.valueText}>
          {value}/{maxValue}
        </Text>
      </View>

      <View style={styles.emptyBar}>
        <View
          style={[
            styles.filledBar,
            {
              width: `${percentage}%`, // 3. Usamos el porcentaje calculado
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", marginBottom: 15 }, // Agregué un margen abajo para separar las barras
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  labelText: { fontWeight: "bold", color: "#555", fontSize: 14 },
  valueText: { color: "#888", fontSize: 12, fontWeight: "600" },
  emptyBar: {
    height: 12, // Un poco más fino queda más elegante
    backgroundColor: "#E0E0E0",
    borderRadius: 6,
    overflow: "hidden",
  },
  filledBar: { height: "100%", borderRadius: 6 },
});
