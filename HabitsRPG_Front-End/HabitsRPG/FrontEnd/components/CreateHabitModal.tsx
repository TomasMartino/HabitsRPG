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
} from "react-native";

export default function CreateHabitModal({ visible, onClose, onCreate }: any) {
  const [name, setName] = useState("");
  const [type, setType] = useState("POSITIVE");
  const [loading, setLoading] = useState(false);

  // Estados para los valores numéricos (los manejamos como string para el input)
  const [xp, setXp] = useState("20");
  const [gold, setGold] = useState("10");
  const [energy, setEnergy] = useState("10");
  const [hpPenalty, setHpPenalty] = useState("10");

  // Resetear valores cuando se abre el modal
  useEffect(() => {
    if (visible) {
      setName("");
      setType("POSITIVE");
      setXp("20");
      setGold("10");
      setEnergy("10");
      setHpPenalty("10");
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setLoading(true);

    const newHabit = {
      name: name,
      type: type,
      // Convertimos los textos a números. Si está vacío, enviamos 0.
      xpReward: type === "POSITIVE" ? parseInt(xp) || 0 : 0,
      goldReward: type === "POSITIVE" ? parseInt(gold) || 0 : 0,
      hpPenalty: type === "NEGATIVE" ? parseInt(hpPenalty) || 0 : 0,
      energyCost: parseInt(energy) || 0,
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
          <ScrollView>
            <Text style={styles.title}>Diseñar Misión</Text>

            {/* Input Nombre */}
            <Text style={styles.label}>Nombre de la Misión</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Leer 10 páginas..."
              value={name}
              onChangeText={setName}
            />

            {/* Selector de Tipo */}
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

            {/* CAMPOS DINÁMICOS */}
            <View style={styles.statsContainer}>
              {/* Si es POSITIVO: XP y Oro */}
              {type === "POSITIVE" && (
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.labelSmall}>XP (Experiencia)</Text>
                    <TextInput
                      style={styles.numInput}
                      value={xp}
                      onChangeText={setXp}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.labelSmall}>Oro (Recompensa)</Text>
                    <TextInput
                      style={styles.numInput}
                      value={gold}
                      onChangeText={setGold}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              {/* Si es NEGATIVO: Daño de Vida */}
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

              {/* ENERGÍA (Siempre visible, pero cambia el texto) */}
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

            {/* Botones de Acción */}
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
                  <Text style={styles.whiteText}>CREAR</Text>
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
    maxHeight: "80%",
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
    marginBottom: 20,
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
    marginBottom: 20,
  },
  row: { flexDirection: "row", gap: 15 },
  col: { flex: 1 },

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
