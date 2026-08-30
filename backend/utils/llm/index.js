import * as gemini from "./providers/gemini.js";
import * as anthropic from "./providers/anthropic.js";
import * as openrouter from "./providers/openrouter.js";

const PROVIDERS = { gemini, anthropic, openrouter };

const DEFAULT_CHAIN = ["gemini", "openrouter", "anthropic"];

export const listProviders = () =>
  Object.values(PROVIDERS)
    .filter((provider) => provider.isConfigured())
    .map((provider) => provider.name);

// A single named provider — used when the caller explicitly wants one.
export const resolveProvider = (requested) => {
  const key = requested || DEFAULT_CHAIN[0];
  if (key === "none") return null;
  const provider = PROVIDERS[key];
  if (!provider || !provider.isConfigured()) return null;
  return provider;
};

// Ordered list of configured providers to try in turn.
//
// An explicitly requested provider returns a chain of one — when you're
// comparing models, silently falling back to a different one would make
// the comparison meaningless.
export const resolveProviderChain = (requested) => {
  if (requested === "none") return [];
  if (requested) {
    const single = resolveProvider(requested);
    return single ? [single] : [];
  }

  const order = (process.env.PROGRAM_PROVIDER_CHAIN || DEFAULT_CHAIN.join(","))
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  return order
    .map((name) => PROVIDERS[name])
    .filter((provider) => provider && provider.isConfigured());
};
