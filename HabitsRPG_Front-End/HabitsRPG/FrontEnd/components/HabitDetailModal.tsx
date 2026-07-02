import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function HabitDetailModal({
  visible,
  habit,
  onClose,
  onComplete,
}: any) {
  // Estado local para controlar qué casillas están marcadas
  const [checkedItems, setCheckedItems] = useState<boolean[]>([]);

  // Cuando se abre el modal, reiniciamos los checks
  useEffect(() => {
    if (habit && habit.subTasks) {
      setCheckedItems(new Array(habit.subTasks.length).fill(false));
    }
  }, [habit]);

  if (!habit) return null;

  const toggleCheck = (index: number) => {
    const updated = [...checkedItems];
    updated[index] = !updated[index];
    setCheckedItems(updated);
  };

  const handleFinish = () => {
    // Aquí validamos si completó todo (opcional)
    const allChecked = checkedItems.every((item) => item === true);

    if (!allChecked && habit.type === "POSITIVE") {
      Alert.alert(
        "Misión Incompleta",
        "¿Seguro que quieres terminar sin completar todas las tareas?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Sí, terminar", onPress: () => onComplete(habit) },
        ],
      );
    } else {
      // Todo listo, enviamos
      onComplete(habit);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.questLog}>
          {/* ENCABEZADO RPG */}
          <View
            style={[
              styles.header,
              habit.type === "NEGATIVE" ? styles.headerBad : styles.headerGood,
            ]}
          >
            <Text style={styles.title}>{habit.title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={30} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.description}>
              {habit.description ||
                "Completa las tareas para reclamar tu recompensa."}
            </Text>

            {/* RECOMPENSAS VISIBLES */}
            <View style={styles.rewardsRow}>
              {habit.type === "POSITIVE" ? (
                <>
                  <Text style={styles.rewardTag}>⭐ {habit.xpReward} XP</Text>
                  <Text style={styles.rewardTag}>
                    💰 {habit.goldReward} Oro
                  </Text>
                </>
              ) : (
                <Text
                  style={[
                    styles.rewardTag,
                    { backgroundColor: "#ffebee", color: "#d32f2f" },
                  ]}
                >
                  💀 Daño: {habit.hpPenalty} HP
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            {/* 📋 LISTA DE SUBTAREAS (ETIQUETAS) */}
            <Text style={styles.subTitle}>Objetivos:</Text>

            {habit.subTasks && habit.subTasks.length > 0 ? (
              habit.subTasks.map((task: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.taskRow,
                    checkedItems[index] && styles.taskRowChecked,
                  ]}
                  onPress={() => toggleCheck(index)}
                >
                  {/* Icono Dinámico */}
                  <Ionicons
                    name={
                      checkedItems[index]
                        ? "checkbox"
                        : task.type === "TIMER"
                          ? "timer-outline"
                          : "square-outline"
                    }
                    size={24}
                    color={checkedItems[index] ? "#4CAF50" : "#888"}
                  />

                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text
                      style={[
                        styles.taskText,
                        checkedItems[index] && styles.textChecked,
                      ]}
                    >
                      {task.name}
                    </Text>
                    <Text style={styles.taskMeta}>
                      {task.type === "TIMER"
                        ? `⏱ Duración: ${task.targetValue} min`
                        : `🎯 Meta: ${task.targetValue} reps`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ fontStyle: "italic", color: "#999" }}>
                Misión simple (Sin subtareas)
              </Text>
            )}
          </ScrollView>

          {/* BOTÓN FINALIZAR */}
          <TouchableOpacity style={styles.completeBtn} onPress={handleFinish}>
            <Text style={styles.completeBtnText}>
              {habit.type === "POSITIVE"
                ? "¡Misión Cumplida!"
                : "Aceptar Consecuencias"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)", // Fondo más oscuro para efecto cine
    justifyContent: "center",
    padding: 20,
  },
  questLog: {
    backgroundColor: "#fff", // Color papel antiguo opcional: #FFF8E1
    borderRadius: 15,
    overflow: "hidden",
    maxHeight: "80%",
    elevation: 10,
  },
  header: {
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerGood: { backgroundColor: "#2196F3" },
  headerBad: { backgroundColor: "#F44336" },

  title: { color: "white", fontSize: 20, fontWeight: "bold", flex: 1 },

  content: { padding: 20 },
  description: { color: "#666", marginBottom: 15, fontStyle: "italic" },

  rewardsRow: { flexDirection: "row", gap: 10, marginBottom: 15 },
  rewardTag: {
    backgroundColor: "#E3F2FD",
    color: "#1565C0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    fontWeight: "bold",
    fontSize: 12,
  },

  divider: { height: 1, backgroundColor: "#eee", marginBottom: 15 },
  subTitle: { fontWeight: "bold", marginBottom: 10, fontSize: 16 },

  // Estilos Tareas
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  taskRowChecked: {
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6A7",
  },
  taskText: { fontSize: 16, color: "#333" },
  textChecked: { textDecorationLine: "line-through", color: "#888" },
  taskMeta: { fontSize: 12, color: "#999" },

  completeBtn: {
    backgroundColor: "#4CAF50",
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  completeBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
    textTransform: "uppercase",
  },
});
