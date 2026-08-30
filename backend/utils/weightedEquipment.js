// Mirror of web/app/utils/weightedEquipment.js. Duplicated rather than
// shared because web and backend have no common package — if one changes,
// change both.
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
