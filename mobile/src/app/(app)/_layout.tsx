import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth-context";

export default function AppLayout() {
  const { user, loading } = useAuth();

  // Restoring a session from disk is genuinely async. Without this branch the
  // login screen flashes on every cold start before the stored session loads.
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f0f11", justifyContent: "center" }}>
        <ActivityIndicator color="#ff2625" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}