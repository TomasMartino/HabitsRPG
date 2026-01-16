import React from "react";
import { Image, StyleSheet, View } from "react-native";

// Importamos las imágenes estáticamente (React Native lo prefiere así)
const imgFull = require("@/assets/images/avatar_full.png");
const imgHurt = require("@/assets/images/avatar_hurt.png");
const imgDead = require("@/assets/images/avatar_dead.png");

interface PlayerAvatarProps {
  health: number;
  lives: number;
}

export default function PlayerAvatar({ health, lives }: PlayerAvatarProps) {
  // Lógica para elegir la imagen
  let currentImage = imgFull; // Por defecto: Sano

  if (lives === 0 && health === 0) {
    currentImage = imgDead; // Muerto
  } else if (health <= 50) {
    currentImage = imgHurt; // Herido
  }

  return (
    <View style={styles.container}>
      <Image source={currentImage} style={styles.avatar} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center", 
  },
  avatar: {
    width: 100, // Ajusta el tamaño a tu gusto
    height: 150,
    borderRadius: 150,
  },
});
