import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
          },
          default: {},
        }),
      }}
    >
      {/* Pestaña 1: DASHBOARD (Tu archivo index.tsx) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard", // Cambiamos "Home" por Dashboard
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      {/* Pestaña 2: HÁBITOS (Tu archivo habits.tsx) */}
      <Tabs.Screen
        name="habits"
        options={{
          title: "Hábitos",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="list.bullet" color={color} />
          ),
        }}
      />

      {/* Pestaña 3: TIENDA (Reemplaza explore.tsx) */}
      <Tabs.Screen
        name="shop"
        options={{
          title: "Tienda",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="cart.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
