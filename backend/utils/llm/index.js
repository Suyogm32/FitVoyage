import * as gemini from "./providers/gemini.js";
import * as anthropic from "./providers/anthropic.js";
import * as openrouter from "./providers/openrouter.js";

const PROVIDERS = { gemini, anthropic, openrouter };

export const listProviders = () =>
  Object.values(PROVIDERS)
    .filter((provider) => provider.isConfigured())
    .map((provider) => provider.name);

// Returns null when the provider is unknown, unconfigured, or explicitly
// "none" — callers treat null as "no AI available" rather than an error.
export const resolveProvider = (requested) => {
  const key = requested || process.env.PROGRAM_PROVIDER || "gemini";
  if (key === "none") return null;
  const provider = PROVIDERS[key];
  if (!provider || !provider.isConfigured()) return null;
  return provider;
};