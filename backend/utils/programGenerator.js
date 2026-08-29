import { resolveProvider } from "./llm/index.js";
import { buildProgramPayload, validatePlan } from "./programCatalogue.js";

const SYSTEM_PROMPT = `You are a strength coach building a training program.

You will receive an athlete's profile and a catalogue of exercises they can actually perform with the equipment they have.

Rules:
- Choose exercises ONLY from the provided catalogue, using their exact id. Never invent an id.
- Produce exactly profile.daysPerWeek training days, spread sensibly across the week.
- Do not train the same body part hard on consecutive days.
- Match volume and complexity to profile.experience — a beginner gets fewer and simpler movements.
- direction "cut" means preserve strength on moderate volume; "bulk" means more volume; "maintain" is balanced.
- goal "get_stronger" favours lower reps on compound lifts; "build_muscle" favours moderate reps; "general_fitness" is balanced.
- reps must be an array with exactly as many entries as sets. If load ascends across sets, reps should descend.
- focus: 2-4 words naming the day's emphasis.

If scope is "day", return exactly one day, using targetDay as its day value.

Return ONLY valid JSON, no markdown fences:
{"days":[{"day":"mon","focus":"chest and triceps","exercises":[{"exerciseId":"abc123","sets":3,"reps":[12,10,8]}]}]}`;

const parseResponse = (text) => {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned);
};

export const generateProgram = async ({
  trainingProfile,
  catalogue,
  scope = "week",
  targetDay = null,
  weightUnit = "kg",
  provider: requestedProvider,
}) => {
  const provider = resolveProvider(requestedProvider);
  if (!provider) {
    return { ok: false, reason: "no_provider", days: [], dropped: [] };
  }

  const payload = buildProgramPayload({
    trainingProfile,
    catalogue,
    scope,
    targetDay,
    weightUnit,
  });

  let text;
  try {
    text = await provider.complete({ system: SYSTEM_PROMPT, payload });
  } catch (error) {
    console.error(`Program generation failed (${provider.name}):`, error.message);
    return { ok: false, reason: "provider_error", days: [], dropped: [] };
  }

  let parsed;
  try {
    parsed = parseResponse(text);
  } catch (error) {
    console.error("Program generation returned unparseable output:", error.message);
    return { ok: false, reason: "bad_json", days: [], dropped: [] };
  }

  // Validate against exactly the ids we sent, not the whole catalogue.
  const allowedIds = new Set(catalogue.map((exercise) => exercise.id));
  const { days, dropped } = validatePlan(parsed, allowedIds);

  return { ok: days.length > 0, reason: null, provider: provider.name, days, dropped };
};