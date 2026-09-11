import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "@/lib/firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!credential.user.emailVerified) {
        setError("Verify your email before logging in — check your inbox.");
        await auth.signOut();
      }
      // No navigation here on success. onAuthStateChanged fires, the (auth)
      // layout sees a user, and its <Redirect> moves us. Same reason the web
      // app doesn't push after login.
    } catch (err) {
      setError(
        err.code === "auth/invalid-credential"
          ? "Invalid email or password."
          : "Couldn't log in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.form}>
          <Text style={styles.title}>Log in</Text>
          <Text style={styles.subtitle}>Pick up where you left off.</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6b6b73"
            value={email}
            onChangeText={setEmail}
            // Android capitalises the first letter by default, which silently
            // breaks email login. autoCorrect off for the same reason.
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6b6b73"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={submitting}
            // Pressable's style can be a function of press state — this is how
            // you get a :active equivalent without CSS.
            style={({ pressed }) => [
              styles.button,
              (pressed || submitting) && styles.buttonPressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Log in</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0f0f11" },
  fill: { flex: 1 },
  form: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { color: "#ffffff", fontSize: 32, fontWeight: "700" },
  subtitle: { color: "#9b9ba3", fontSize: 16, marginBottom: 12 },
  input: {
    backgroundColor: "#1b1b1f",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#ffffff",
    fontSize: 16,
  },
  error: { color: "#ff6b6b", fontSize: 14 },
  button: {
    backgroundColor: "#ff2625",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
});