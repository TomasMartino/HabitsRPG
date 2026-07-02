import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // Necesario para iconos de basura/agregar

// Definimos la estructura de una Subtarea
interface SubTask {
  name: string;
  type: "CHECKLIST" | "TIMER";
  targetValue: string;
}

export default function CreateHabitModal({ visible, onClose, onCreate }: any) {
  const [name, setName] = useState("");
  const [type, setType] = useState("POSITIVE");
  const [loading, setLoading] = useState(false);

  // Estados RPG
  const [xp, setXp] = useState("20");
  const [gold, setGold] = useState("10");
  const [energy, setEnergy] = useState("10");
  const [hpPenalty, setHpPenalty] = useState("10");

  // 🆕 ESTADO PARA SUBTAREAS
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);

  // Resetear valores al abrir
  useEffect(() => {
    if (visible) {
      setName("");
      setType("POSITIVE");
      setXp("20");
      setGold("10");
      setEnergy("10");
      setHpPenalty("10");
      setSubTasks([]); // Limpiamos subtareas
    }
  }, [visible]);

  // --- LÓGICA DE SUBTAREAS ---
  const addSubTask = () => {
    setSubTasks([
      ...subTasks,
      { name: "", type: "CHECKLIST", targetValue: "" },
    ]);
  };

  const removeSubTask = (index: number) => {
    const updated = [...subTasks];
    updated.splice(index, 1);
    setSubTasks(updated);
  };

  const updateSubTask = (
    index: number,
    field: keyof SubTask,
    value: string,
  ) => {
    const updated = [...subTasks];
    // @ts-ignore
    updated[index][field] = value;
    setSubTasks(updated);
  };
  // ---------------------------

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Falta Nombre", "Por favor ponle un nombre a la misión.");
      return;
    }

    setLoading(true);

    const newHabit = {
      title: name, // Asegúrate que tu Backend espera 'title' o 'name'
      type: type,
      xpReward: type === "POSITIVE" ? parseInt(xp) || 0 : 0,
      goldReward: type === "POSITIVE" ? parseInt(gold) || 0 : 0,
      hpPenalty: type === "NEGATIVE" ? parseInt(hpPenalty) || 0 : 0,
      energyCost: parseInt(energy) || 0,

      // 🆕 ENVIAMOS LAS SUBTAREAS PROCESADAS
      subTasks: subTasks.map((t) => ({
        name: t.name,
        type: t.type,
        targetValue: parseInt(t.targetValue) || 1,
      })),
    };

    await onCreate(newHabit);
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Diseñar Misión</Text>

            {/* Input Nombre Principal */}
            <Text style={styles.label}>Nombre de la Misión</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Rutina de Mañana..."
              value={name}
              onChangeText={setName}
            />

            {/* Selector de Tipo (Bueno/Malo) */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  type === "POSITIVE" && styles.selectedPos,
                ]}
                onPress={() => setType("POSITIVE")}
              >
                <Text style={styles.btnText}>👍 Buen Hábito</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  type === "NEGATIVE" && styles.selectedNeg,
                ]}
                onPress={() => setType("NEGATIVE")}
              >
                <Text style={styles.btnText}>😈 Mal Hábito</Text>
              </TouchableOpacity>
            </View>

            {/* SECCIÓN DE STATS RPG */}
            <View style={styles.statsContainer}>
              {type === "POSITIVE" && (
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.labelSmall}>XP (Exp)</Text>
                    <TextInput
                      style={styles.numInput}
                      value={xp}
                      onChangeText={setXp}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.labelSmall}>Oro ($)</Text>
                    <TextInput
                      style={styles.numInput}
                      value={gold}
                      onChangeText={setGold}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              {type === "NEGATIVE" && (
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.labelSmall}>Daño (HP)</Text>
                    <TextInput
                      style={[
                        styles.numInput,
                        { borderColor: "#F44336", color: "#F44336" },
                      ]}
                      value={hpPenalty}
                      onChangeText={setHpPenalty}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              <View style={[styles.row, { marginTop: 10 }]}>
                <View style={styles.col}>
                  <Text style={styles.labelSmall}>
                    {type === "POSITIVE"
                      ? "Costo de Energía ⚡"
                      : "Energía Recuperada ⚡"}
                  </Text>
                  <TextInput
                    style={styles.numInput}
                    value={energy}
                    onChangeText={setEnergy}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* 🆕 SECCIÓN DE ETIQUETAS / SUBTAREAS */}
            <Text style={[styles.label, { marginTop: 10 }]}>
              Etiquetas / Subtareas
            </Text>
            <Text style={styles.labelSmall}>
              Agrega pasos para completar este hábito.
            </Text>

            <View style={styles.subTasksList}>
              {subTasks.map((task, index) => (
                <View key={index} style={styles.subTaskRow}>
                  {/* Input Nombre Subtarea */}
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.inputSmall}
                      placeholder="Ej: Flexiones"
                      value={task.name}
                      onChangeText={(text) =>
                        updateSubTask(index, "name", text)
                      }
                    />
                    <View style={styles.rowCenter}>
                      {/* Selector Tipo: Timer vs Reps */}
                      <TouchableOpacity
                        onPress={() =>
                          updateSubTask(
                            index,
                            "type",
                            task.type === "CHECKLIST" ? "TIMER" : "CHECKLIST",
                          )
                        }
                        style={[
                          styles.miniBadge,
                          {
                            backgroundColor:
                              task.type === "CHECKLIST" ? "#2196F3" : "#FF9800",
                          },
                        ]}
                      >
                        <Text style={styles.miniBadgeText}>
                          {task.type === "CHECKLIST" ? "# Reps" : "⏱ Min"}
                        </Text>
                      </TouchableOpacity>

                      {/* Input Valor Meta */}
                      <TextInput
                        style={styles.inputTiny}
                        placeholder="0"
                        keyboardType="numeric"
                        value={task.targetValue}
                        onChangeText={(text) =>
                          updateSubTask(index, "targetValue", text)
                        }
                      />
                    </View>
                  </View>

                  {/* Botón Borrar */}
                  <TouchableOpacity
                    onPress={() => removeSubTask(index)}
                    style={{ padding: 5 }}
                  >
                    <Ionicons name="trash-outline" size={22} color="#F44336" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.btnAddSub} onPress={addSubTask}>
                <Ionicons name="add" size={20} color="#4CAF50" />
                <Text style={{ color: "#4CAF50", fontWeight: "bold" }}>
                  Agregar Etiqueta
                </Text>
              </TouchableOpacity>
            </View>

            {/* Botones Finales */}
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={{ color: "#666" }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit}
                style={styles.createBtn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.whiteText}>CREAR MISIÓN</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    maxHeight: "90%", // Un poco más alto para que quepan las tareas
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  label: { fontSize: 14, fontWeight: "bold", color: "#555", marginBottom: 5 },
  labelSmall: { fontSize: 12, color: "#777", marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
  },
  numInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    textAlign: "center",
    backgroundColor: "#fff",
  },
  typeSelector: { flexDirection: "row", gap: 10, marginBottom: 20 },
  typeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  selectedPos: { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" },
  selectedNeg: { backgroundColor: "#FFEBEE", borderColor: "#F44336" },
  btnText: { fontWeight: "bold", color: "#333" },

  statsContainer: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  row: { flexDirection: "row", gap: 15 },
  col: { flex: 1 },

  // Estilos Subtareas
  subTasksList: { marginBottom: 20, marginTop: 5 },
  subTaskRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  inputSmall: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 5,
    fontSize: 14,
    paddingVertical: 2,
  },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  miniBadgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  inputTiny: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    width: 50,
    textAlign: "center",
    paddingVertical: 2,
    fontSize: 14,
  },
  btnAddSub: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#4CAF50",
    borderRadius: 8,
    backgroundColor: "#F1F8E9",
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 15,
    alignItems: "center",
    marginTop: 10,
  },
  cancelBtn: { padding: 10 },
  createBtn: {
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  whiteText: { color: "white", fontWeight: "bold" },
});
