// The identities this pack claims, as plain constants, so the display can read
// them without pulling the manifest into its import graph. `src/index.ts`
// re-exports them beside the manifest, and `tests/manifest.test.ts` keeps them in
// agreement with `package.json`.

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

/**
 * The portlet representation media type (cinatra#3092,
 * specs/app-artifact-review.html §XI.6): the form a portlet revision is stored
 * under. A portlet revision holds one cut, not a whole dashboard, so it has its
 * own form, and a portlet revision can never be read as a dashboard.
 */
export const DASHBOARD_PORTLET_MEDIA_TYPE =
  "application/vnd.cinatra.dashboard-portlet+json" as const;

/**
 * The portlet object type (cinatra#3092, specs/app-artifact-review.html §XI.6):
 * one entry of a dashboard, addressable on its own. Its identity is the
 * dashboard and the entry's stable instance id; an explicit cut creates or
 * extends it, and an ordinary dashboard save mints none.
 */
export const DASHBOARD_PORTLET_OBJECT_TYPE =
  "@cinatra-ai/dashboard-artifact:portlet" as const;
