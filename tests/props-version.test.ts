// @vitest-environment node
// THE PROPS VERSION IS ONE NUMBER, DECLARED IN THREE PLACES (cinatra#3092), and
// they may never drift: the module constant the display checks a snapshot
// against, the `propsApiVersion` the renderer entry declares in the
// authoritative manifest, and the typed manifest this package exports.
//
// The host resolves a display, reads the version it declares, and builds the
// snapshot AT THAT VERSION. Version 3 is the one whose snapshot carries the
// review reading and the data road this display draws from; a manifest that
// declared another version would be handed a snapshot without them.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ARTIFACT_RENDERER_PROPS_API_VERSION } from "../src/artifact-renderer-props";
import { dashboardArtifactManifest } from "../src/index";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as {
  cinatra: {
    artifact: {
      ui?: { renderers: Record<string, { entry: string; propsApiVersion: number }> };
    };
  };
};

const SLOTS = ["detail"] as const;

describe("the props version this display is built against", () => {
  it("is 3 — the version whose snapshot carries the review reading and the data road", () => {
    expect(ARTIFACT_RENDERER_PROPS_API_VERSION).toBe(3);
  });

  it("is declared by the detail entry in the authoritative manifest", () => {
    const renderers = pkg.cinatra.artifact.ui?.renderers ?? {};
    expect(Object.keys(renderers).sort()).toEqual([...SLOTS].sort());
    for (const slot of SLOTS) {
      expect(renderers[slot]!.propsApiVersion, slot).toBe(ARTIFACT_RENDERER_PROPS_API_VERSION);
    }
  });

  it("is declared by the exported typed manifest, in lock-step with package.json", () => {
    const renderers = (
      dashboardArtifactManifest as { ui?: { renderers: Record<string, { propsApiVersion: number }> } }
    ).ui?.renderers;
    for (const slot of SLOTS) {
      expect(renderers?.[slot]?.propsApiVersion, slot).toBe(ARTIFACT_RENDERER_PROPS_API_VERSION);
    }
  });
});
