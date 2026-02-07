import { Stack } from "expo-router";
import * as React from "react";
import "../global.css";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false
      }}
    />
  );
}

