const ENDPOINT = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 30000;

export const name = "anthropic";

export const isConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

export const complete = async ({ system, payload }) => {
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: JSON.stringify(payload) }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return data?.content?.find((block) => block.type === "text")?.text || "";
  } finally {
    clearTimeout(timer);
  }
};
