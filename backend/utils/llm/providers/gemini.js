const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 30000;

export const name = "gemini";

export const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

export const complete = async ({ system, payload }) => {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `${ENDPOINT}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: JSON.stringify(payload) }] }],
          // Forces JSON output rather than hoping the prompt is obeyed.
          generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } finally {
    clearTimeout(timer);
  }
};