import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TODAY = [
  { id: "1", name: "Barbell Bench Press", sets: 3, reps: "10 / 8 / 8" },
  { id: "2", name: "Dumbbell Incline Fly", sets: 3, reps: "12 / 10 / 10" },
  { id: "3", name: "Cable Pushdown", sets: 3, reps: "15 / 12 / 12" },
];

export default function HomeScreen() {
  return (
    // flex: 1 makes this fill the screen. Without it the view is only as
    // tall as its content — there is no height: 100vh here.
    <SafeAreaView style={styles.screen}>
      <Text style={styles.heading}>Today</Text>
      <Text style={styles.subheading}>Chest and triceps</Text>

      <View style={styles.list}>
        {TODAY.map((exercise) => (
          // The default direction is column, so this row has to opt in.
          <View key={exercise.id} style={styles.card}>
            <View style={styles.cardText}>
              <Text style={styles.name}>{exercise.name}</Text>
              {/* Styles don't inherit — this Text needs its own colour even
                  though its parent has one. */}
              <Text style={styles.meta}>
                {exercise.sets} sets · {exercise.reps}
              </Text>
            </View>
            <Text style={styles.badge}>todo</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0f0f11", padding: 20 },
  heading: { color: "#ffffff", fontSize: 32, fontWeight: "700" },
  subheading: { color: "#9b9ba3", fontSize: 16, marginTop: 2 },
  list: { marginTop: 24, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1b1b1f",
    borderRadius: 14,
    padding: 14,
  },
  cardText: { flex: 1 },
  name: { color: "#ffffff", fontSize: 16, fontWeight: "500" },
  meta: { color: "#9b9ba3", fontSize: 13, marginTop: 4 },
  badge: {
    color: "#9b9ba3",
    fontSize: 12,
    backgroundColor: "#2a2a30",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
});