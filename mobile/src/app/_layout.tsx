import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      {/* Headers off — each group draws its own chrome. */}
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}