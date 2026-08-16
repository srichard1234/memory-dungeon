import pkg from "@/package.json";

// major.minor.build — minor is bumped by hand for feature-sized changes,
// build is bumped automatically by .git/hooks/pre-push on every push.
export const VERSION = pkg.version;
