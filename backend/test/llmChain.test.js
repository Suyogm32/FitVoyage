import test from "node:test";
import assert from "node:assert/strict";
import {
  listProviders,
  resolveProvider,
  resolveProviderChain,
} from "../utils/llm/index.js";

const ENV_KEYS = [
  "GEMINI_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENROUTER_API_KEY",
  "PROGRAM_PROVIDER_CHAIN",
];

// isConfigured() reads process.env at call time, so the chain can be driven
// entirely from env. Snapshot and restore so a developer's real keys don't
// change the outcome.
const withEnv = (vars, fn) => {
  const saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  Object.assign(process.env, vars);
  try {
    return fn();
  } finally {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
};

const names = (chain) => chain.map((provider) => provider.name);

test("an empty chain when nothing is configured", () => {
  withEnv({}, () => {
    assert.deepEqual(resolveProviderChain(), []);
    assert.deepEqual(listProviders(), []);
  });
});

test("skips providers with no API key", () => {
  withEnv({ OPENROUTER_API_KEY: "x" }, () => {
    assert.deepEqual(names(resolveProviderChain()), ["openrouter"]);
  });
});

test("uses the default order when no override is set", () => {
  withEnv(
    { GEMINI_API_KEY: "x", ANTHROPIC_API_KEY: "x", OPENROUTER_API_KEY: "x" },
    () => {
      assert.deepEqual(names(resolveProviderChain()), [
        "gemini",
        "openrouter",
        "anthropic",
      ]);
    },
  );
});

test("PROGRAM_PROVIDER_CHAIN overrides the order", () => {
  withEnv(
    {
      GEMINI_API_KEY: "x",
      ANTHROPIC_API_KEY: "x",
      OPENROUTER_API_KEY: "x",
      PROGRAM_PROVIDER_CHAIN: "anthropic, gemini",
    },
    () => {
      assert.deepEqual(names(resolveProviderChain()), ["anthropic", "gemini"]);
    },
  );
});

test("ignores unknown names in the override", () => {
  withEnv(
    { GEMINI_API_KEY: "x", PROGRAM_PROVIDER_CHAIN: "nope,gemini,alsonope" },
    () => {
      assert.deepEqual(names(resolveProviderChain()), ["gemini"]);
    },
  );
});

// Falling back silently would make a model comparison meaningless.
test("an explicitly requested provider gives a chain of exactly one", () => {
  withEnv({ GEMINI_API_KEY: "x", ANTHROPIC_API_KEY: "x" }, () => {
    assert.deepEqual(names(resolveProviderChain("anthropic")), ["anthropic"]);
  });
});

test("requesting an unconfigured provider gives an empty chain, not a fallback", () => {
  withEnv({ GEMINI_API_KEY: "x" }, () => {
    assert.deepEqual(resolveProviderChain("anthropic"), []);
  });
});

test('"none" disables generation entirely', () => {
  withEnv({ GEMINI_API_KEY: "x" }, () => {
    assert.deepEqual(resolveProviderChain("none"), []);
    assert.equal(resolveProvider("none"), null);
  });
});
