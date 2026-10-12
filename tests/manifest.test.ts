// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  DASHBOARD_ARTIFACT_MEDIA_TYPE,
  DASHBOARD_ARTIFACT_OBJECT_TYPE,
  dashboardArtifactManifest,
} from "../src/index";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as {
  name: string;
  cinatra: {
    apiVersion: string;
    kind: string;
    displayName: string;
    vendor: { key: string; name: string };
    dependencies: unknown[];
    artifact: {
      accepts: { dashboard?: true; file?: unknown; connectorRef?: unknown };
      ui?: unknown;
      skills?: unknown;
      objectTypes?: Array<{
        type: string;
        claim: string;
        dispositions?: {
          projection?: string;
          pinnable?: boolean;
          snapshotPolicy?: string;
          sensitivity?: string;
          mutability?: string;
        };
        schema?: {
          type?: string;
          properties?: Record<string, unknown>;
          required?: string[];
          additionalProperties?: boolean;
        };
      }>;
    };
  };
};

const ARTIFACT_ALLOWED_CINATRA_KEYS = new Set([
  "kind",
  "apiVersion",
  "artifact",
  "dependencies",
  "roles",
  "displayName",
  "vendor",
]);

describe("package.json manifest — the generic dashboard-artifact identity", () => {
  it("names the package per the @cinatra-ai/<slug>-artifact convention", () => {
    expect(pkg.name).toBe("@cinatra-ai/dashboard-artifact");
  });

  it("declares the first-party artifact identity", () => {
    expect(pkg.cinatra.kind).toBe("artifact");
    expect(pkg.cinatra.apiVersion).toBe("cinatra.ai/v1");
    expect(pkg.cinatra.displayName).toBe("Dashboard");
    expect(pkg.cinatra.vendor).toEqual({ key: "cinatra-ai", name: "Cinatra" });
  });

  it("omits dependency edges (a system base is platform-guaranteed)", () => {
    expect(pkg.cinatra.dependencies).toEqual([]);
  });

  it("declares only the allowed cinatra.* keys", () => {
    for (const k of Object.keys(pkg.cinatra)) {
      expect(ARTIFACT_ALLOWED_CINATRA_KEYS.has(k)).toBe(true);
    }
  });

  it("ships ONE display for the dashboard form and NO matcher skill", () => {
    // The pack ships its own dashboard display (cinatra#3092): one `detail`
    // renderer over the dashboard media type, at the props version whose
    // snapshot carries the review reading and the data road. Dashboards are
    // minted by the twin writer, not classified from an upload — so no matcher
    // skill bundle.
    expect(pkg.cinatra.artifact.ui).toEqual({
      abiVersion: 1,
      sdkAbiRange: "^2.5.0",
      renderers: {
        detail: {
          entry: "./src/renderers/detail.tsx",
          propsApiVersion: 3,
          representations: ["application/vnd.cinatra.dashboard+json"],
        },
      },
    });
    expect("skills" in pkg.cinatra.artifact).toBe(false);
  });

  it("accepts EXACTLY the dashboard representation form (no file/connectorRef)", () => {
    expect(pkg.cinatra.artifact.accepts).toEqual({ dashboard: true });
  });

  it("DECLARES exactly one generic dashboard object type", () => {
    const claims = pkg.cinatra.artifact.objectTypes;
    expect(Array.isArray(claims)).toBe(true);
    expect(claims).toHaveLength(1);

    const [claim] = claims!;
    // Namespaced, self-registered under this package's own namespace.
    expect(claim.type).toBe("@cinatra-ai/dashboard-artifact:dashboard");
    expect(claim.type.startsWith(`${pkg.name}:`)).toBe(true);
    expect(claim.claim).toBe("dedicated");

    // Artifact-safe projection, snapshotted by metadata (not bytes), not
    // pinnable into context. NO mutability class is declared: a dashboard twin
    // is a living record the twin writer (B1b) updates on every dashboard
    // mutation, so pinning it immutable (record/external) would be wrong; the
    // precise ceiling is set by B1b.
    expect(claim.dispositions).toEqual({
      projection: "artifact-safe",
      pinnable: false,
      snapshotPolicy: "metadata",
      sensitivity: "normal",
    });
    expect(claim.dispositions && "mutability" in claim.dispositions).toBe(false);

    // The claim ships an inline schema (self-registered types still ship one)
    // carrying the dashboard summary (dashboardId/status/entityRef) plus the
    // standard ArtifactObjectData metadata fields the twin preserves (D7).
    expect(claim.schema?.type).toBe("object");
    const props = claim.schema?.properties ?? {};
    for (const key of [
      "artifactType",
      "dashboardId",
      "status",
      "entityRef",
      "mime",
      "size",
      "originKind",
      "latestRepresentationRevisionId",
    ]) {
      expect(key in props).toBe(true);
    }
    // The formless dashboard row pins its representation media type in-schema.
    expect((props.mime as { const?: string })?.const).toBe(
      "application/vnd.cinatra.dashboard+json",
    );
    expect(claim.schema?.required).toEqual([
      "artifactType",
      "dashboardId",
      "status",
      "mime",
      "size",
      "originKind",
      "latestRepresentationRevisionId",
    ]);
  });

  // The host's dashboard writer stores this form on every dashboard resource:
  // DASHBOARD_RESOURCE_MIME in src/lib/dashboards/dashboard-artifact-twin-writer.ts.
  it("exposes the dashboard media type constant equal to the host writer's form", () => {
    expect(DASHBOARD_ARTIFACT_MEDIA_TYPE).toBe(
      "application/vnd.cinatra.dashboard+json",
    );
  });

  it("keeps the typed src manifest in agreement with package.json", () => {
    expect(dashboardArtifactManifest.accepts).toEqual(pkg.cinatra.artifact.accepts);
    expect((dashboardArtifactManifest as { ui?: unknown }).ui).toEqual(pkg.cinatra.artifact.ui);
    expect(dashboardArtifactManifest.objectTypes).toEqual(pkg.cinatra.artifact.objectTypes);
    expect(DASHBOARD_ARTIFACT_OBJECT_TYPE).toBe(
      pkg.cinatra.artifact.objectTypes![0]!.type,
    );
  });
});
