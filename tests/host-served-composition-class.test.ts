// @vitest-environment node
// This package's vendored `extension-kind-gate.mjs` must admit the shared
// read-only composition the host serves at its EXACT specifier (cinatra#3092),
// and nothing wider.
//
// The gate is a MIRROR of the cinatra monorepo's canonical
// `scripts/extensions/inventory.mjs`, whose rule these arms pin: an exact
// host-served specifier is checked before the base-package collapse, so the
// package root and every other subpath of it stay violations. Without the
// mirrored class the display's import of the composition fails this
// repository's own `kind-gates` job, which runs
// `node extension-kind-gate.mjs --package-root .` and is a required context.

import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { isSdkOnlyViolation, runGate } from "../extension-kind-gate.mjs";

const COMPOSITION = "@cinatra-ai/sdk-dashboard/components";

describe("extension-kind-gate host-served composition class", () => {
  it("does not report the exact composition specifier as a violation", () => {
    expect(isSdkOnlyViolation(COMPOSITION)).toBe(false);
  });

  it("still reports the composition's package root and any other subpath", () => {
    expect(isSdkOnlyViolation("@cinatra-ai/sdk-dashboard")).toBe(true);
    expect(isSdkOnlyViolation("@cinatra-ai/sdk-dashboard/other")).toBe(true);
  });

  it("still reports a first-party package the host does not serve", () => {
    expect(isSdkOnlyViolation("@cinatra-ai/objects")).toBe(true);
  });

  it("passes this package root with zero errors", () => {
    const packageRoot = fileURLToPath(new URL("..", import.meta.url));
    const result = runGate(packageRoot) as { errors: string[] };
    expect(result.errors).toEqual([]);
  });
});
