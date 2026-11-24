import type { SemanticArtifactManifest } from "@cinatra-ai/sdk-extensions";

// `@cinatra-ai/dashboard-artifact` — the generic, meaning-free dashboard
// artifact extension (epic cinatra#1883, slice B1a of cinatra#1894).
//
// Every dashboard gets a paired `objects` row of this ONE generic type so the
// artifact library, permissions, and scopes can treat dashboards as first-class
// artifacts. This pack ships MANIFEST + TYPE + its display:
//   - `accepts.dashboard: true` — the dashboard REPRESENTATION FORM the
//     substrate already models (the `file`/`connectorRef`/`dashboard` form enum
//     the host artifact-handler validates); a dashboard is a formless,
//     viewSpec-backed record, not an uploaded blob.
//   - The dedicated object type `@cinatra-ai/dashboard-artifact:dashboard`.
//     Twin rows ALWAYS carry this generic type; meaning ("this is a
//     web-analytics dashboard") arrives later as claim/authoring-skill
//     assertions minted by meaning-type `*-dashboard-artifact` packs (D8),
//     never as a distinct row type.
//
//   - The dedicated object type `@cinatra-ai/dashboard-artifact:portlet`
//     (cinatra#3092, specs/app-artifact-review.html §XI.6): one entry of a
//     dashboard, addressable on its own, minted by an explicit cut only.
//
// The pack ships its displays (cinatra#3092): one `detail` renderer that draws
// a dashboard's pinned configuration, or a portlet's one pinned entry, through
// the shared read-only composition the host serves.
//
// Deliberately NOT shipped here (later slices / host-side):
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

import {
  DASHBOARD_ARTIFACT_MEDIA_TYPE,
  DASHBOARD_ARTIFACT_OBJECT_TYPE,
  DASHBOARD_PORTLET_MEDIA_TYPE,
  DASHBOARD_PORTLET_OBJECT_TYPE,
} from "./object-types";

export {
  DASHBOARD_ARTIFACT_MEDIA_TYPE,
  DASHBOARD_ARTIFACT_OBJECT_TYPE,
  DASHBOARD_PORTLET_MEDIA_TYPE,
  DASHBOARD_PORTLET_OBJECT_TYPE,
};

export const dashboardArtifactManifest: SemanticArtifactManifest = {
  accepts: {
    dashboard: true,
  },
  ui: {
    abiVersion: 1,
    sdkAbiRange: "^2.5.0",
    renderers: {
      detail: {
        entry: "./src/renderers/detail.tsx",
        propsApiVersion: 5,
        representations: [DASHBOARD_ARTIFACT_MEDIA_TYPE, DASHBOARD_PORTLET_MEDIA_TYPE],
      },
    },
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
    {
      type: DASHBOARD_PORTLET_OBJECT_TYPE,
      claim: "dedicated",
      // The same dispositions as the dashboard type. Whether a portlet is
      // pinnable is an open question (cinatra#3092); it stays as the dashboard
      // type has it until that is decided.
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
          // The portlet's identity: the dashboard and the entry's stable
          // instance id within that dashboard.
          dashboardId: { type: "string" },
          portletInstanceId: { type: "string" },
          // The dashboard revision the latest portlet revision was cut from.
          dashboardRevisionId: { type: "string" },
          mime: { type: "string", const: DASHBOARD_PORTLET_MEDIA_TYPE },
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
          "portletInstanceId",
          "dashboardRevisionId",
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
