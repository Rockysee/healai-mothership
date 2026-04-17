import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import DriverScreen from "./src/screens/DriverScreen";
import ParamedicScreen from "./src/screens/ParamedicScreen";

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#050914",
    card: "#0d1628",
    text: "#e5e7eb",
    border: "#1f2937",
    primary: "#22c55e",
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: "#0b1220",
              borderTopColor: "#1e293b",
            },
            tabBarActiveTintColor: "#22c55e",
            tabBarInactiveTintColor: "#64748b",
          }}
        >
          <Tab.Screen name="Driver" component={DriverScreen} />
          <Tab.Screen name="Paramedic" component={ParamedicScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
