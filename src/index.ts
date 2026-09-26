import type { SemanticArtifactManifest } from "@cinatra-ai/sdk-extensions";

// `@cinatra-ai/dashboard-artifact` — the generic, meaning-free dashboard
// artifact extension (epic cinatra#1883, slice B1a of cinatra#1894).
//
// Every dashboard gets a paired `objects` row of this ONE generic type so the
// artifact library, permissions, and scopes can treat dashboards as first-class
// artifacts. This pack ships MANIFEST + TYPE only:
//   - `accepts.dashboard: true` — the dashboard REPRESENTATION FORM the
//     substrate already models (the `file`/`connectorRef`/`dashboard` form enum
//     the host artifact-handler validates); a dashboard is a formless,
//     viewSpec-backed record, not an uploaded blob.
//   - ONE dedicated object type `@cinatra-ai/dashboard-artifact:dashboard`.
//     Twin rows ALWAYS carry this generic type; meaning ("this is a
//     web-analytics dashboard") arrives later as claim/authoring-skill
//     assertions minted by meaning-type `*-dashboard-artifact` packs (D8),
//     never as a distinct row type.
//
// Deliberately NOT shipped here (later slices / host-side):
//   - NO renderer / `ui` bundle. The first-party representation viewer for the
//     dashboard media type is a HOST registration wired in B2, not an
//     extension-shipped renderer.
//   - NO twin writer. `writeDashboardArtifactTwin` + the complete mutation
//     pairing table + the AST-gate extension are slice B1b.
//   - NO backfill. Re-stamping existing dashboards is slice B1c.
//   - NO matcher skill. Dashboards are minted by the twin writer inside the
//     mutation-service transaction, never classified from an upload.
//
// The AUTHORITATIVE manifest is the `cinatra` block in `package.json` (what the
// host install pipeline + the marketplace publish gate read). This module
// re-declares the `artifact` descriptor as a typed value for programmatic use;
// the two are kept in agreement by `tests/manifest.test.ts`.

/**
 * The dashboard representation media type: the form the host's dashboard
 * writer stores on every dashboard's representation resource, and the media
 * type the first-party representation viewer registers against.
 */
export const DASHBOARD_ARTIFACT_MEDIA_TYPE =
  "application/vnd.cinatra.dashboard+json" as const;

/**
 * The single generic object type every dashboard twin row carries. Namespaced
 * under this package (self-registered), so the manifest ships an inline schema
 * per the schema-source rule (cinatra#1432).
 */
export const DASHBOARD_ARTIFACT_OBJECT_TYPE =
  "@cinatra-ai/dashboard-artifact:dashboard" as const;

export const dashboardArtifactManifest: SemanticArtifactManifest = {
  accepts: {
    dashboard: true,
  },
  objectTypes: [
    {
      type: DASHBOARD_ARTIFACT_OBJECT_TYPE,
      claim: "dedicated",
      // NOTE: no `mutability` class is declared here. A dashboard twin is a
      // LIVING record that the transactional twin writer (slice B1b) updates on
      // every dashboard-truth mutation (update, upsertConfig, publish, archive,
      // restore, rename, …). Declaring `record`/`external` would pin the row
      // immutable (mutableBy: []) and contradict that. The precise
      // mutable-principal ceiling is set by B1b alongside the writer; B1a leaves
      // it at the registering type's baseline (no narrowing).
      dispositions: {
        projection: "artifact-safe",
        pinnable: false,
        snapshotPolicy: "metadata",
        sensitivity: "normal",
      },
      schema: {
        type: "object",
        properties: {
          artifactType: { type: "string" },
          title: { type: "string" },
          dashboardId: { type: "string" },
          status: { type: "string" },
          entityRef: { type: "string" },
          // Formless dashboard rows carry no separate form-level MIME — the
          // representation media type is pinned in the object schema itself.
          mime: { type: "string", const: DASHBOARD_ARTIFACT_MEDIA_TYPE },
          size: { type: "number" },
          originKind: { type: "string" },
          latestRepresentationRevisionId: { type: "string" },
          latestDigest: { type: "string" },
          viewerHint: { type: "string" },
          excerpt: { type: "string" },
        },
        required: [
          "artifactType",
          "dashboardId",
          "status",
          "mime",
          "size",
          "originKind",
          "latestRepresentationRevisionId",
        ],
        additionalProperties: true,
      },
    },
  ],
};
