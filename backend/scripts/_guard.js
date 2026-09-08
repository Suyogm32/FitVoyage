// Seed scripts mutate real user data — they delete date ranges, overwrite
// readiness values and flatten logged weights, with no undo. That was
// harmless when MONGODB_URI pointed at a local database. It points at the
// live Atlas cluster now.
//
// Default to refusing. An override exists, but it has to be typed on purpose.

const LOCAL_HOSTS = /localhost|127\.0\.0\.1|0\.0\.0\.0/;

// Show which database is about to be modified without printing credentials.
const describeTarget = (uri) => {
  try {
    const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//, "");
    const afterCredentials = withoutScheme.includes("@")
      ? withoutScheme.split("@").slice(1).join("@")
      : withoutScheme;
    return afterCredentials.split("?")[0];
  } catch {
    return "unknown";
  }
};

export const assertSafeToSeed = (scriptName) => {
  const uri = process.env.MONGODB_URI || "";
  const override = process.env.ALLOW_DESTRUCTIVE_SEED === "yes";

  if (!uri) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  // mongodb+srv:// is Atlas. Anything not pointed at a loopback address is
  // treated as remote — a false positive costs one environment variable, a
  // false negative costs someone's training history.
  const isRemote = uri.startsWith("mongodb+srv://") || !LOCAL_HOSTS.test(uri);
  const isProdEnv = process.env.NODE_ENV === "production";

  if (!isRemote && !isProdEnv) return;

  if (override) {
    console.warn(
      `\n⚠  ${scriptName} is running against a REMOTE database: ${describeTarget(uri)}`,
    );
    console.warn("   ALLOW_DESTRUCTIVE_SEED=yes was set. This will modify real data.\n");
    return;
  }

  console.error(`\nRefusing to run ${scriptName}.`);
  console.error(`  Target looks remote: ${describeTarget(uri)}`);
  console.error("  This script deletes and rewrites logged workout data.\n");
  console.error("  If you are certain, set ALLOW_DESTRUCTIVE_SEED=yes and re-run:");
  console.error("    set ALLOW_DESTRUCTIVE_SEED=yes");
  console.error(`    node scripts/${scriptName}\n`);
  process.exit(1);
};