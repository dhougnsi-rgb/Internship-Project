import React from 'react';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      initialRouteName="SplashScreen"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="SplashScreen" />
      <Stack.Screen name="LoginScreen" />
      <Stack.Screen name="RegisterScreen" />
      <Stack.Screen name="ChooseScreen" />
      <Stack.Screen name="ChatScreen" />
      <Stack.Screen name="HistoryScreen" />
      <Stack.Screen name="ProfileScreen" />
      <Stack.Screen name="AppointmentScreen" />
      <Stack.Screen name="DiagnosticScreen" />
      <Stack.Screen name="MessagesScreen" />
      <Stack.Screen name="MyAppointmentsScreen" />
    </Stack>
  );
}