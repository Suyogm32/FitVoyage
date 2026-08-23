// Equipment values (from ExerciseDB's `equipment` field) that involve an
// external, trackable load. Generated from a distinct-value count of the
// live catalog (backend/scripts/checkEquipment.js) on 2026-08-20 — re-run
// that script and update this list if the catalog is reseeded from a
// different source.
//
// Deliberately excluded: "assisted" (weight is inverse — less weight means
// harder — a plain numeric input would be misleading), plus bodyweight-only
// equipment (body weight, bands, stability/bosu ball, rollers, rope) and
// cardio machines (no set-based load to track).
export const WEIGHTED_EQUIPMENT = new Set([
  "dumbbell",
  "cable",
  "barbell",
  "leverage machine",
  "smith machine",
  "kettlebell",
  "weighted",
  "ez barbell",
  "sled machine",
  "medicine ball",
  "olympic barbell",
  "trap bar",
  "hammer",
]);

export const usesWeightEquipment = (equipment) =>
  WEIGHTED_EQUIPMENT.has((equipment || "").toLowerCase());
