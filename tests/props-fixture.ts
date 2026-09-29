// One authorized-snapshot fixture for the dashboard display (cinatra#3092),
// shaped as the host builds one at the props version this display declares, so
// every suite pins the same shape and a field the host stopped sending fails in
// one place.
//
// The content is the channel's `configuration` kind: the dashboard's pinned
// configuration as the revision recorded it, with its digest.

import type { ArtifactContentProjection } from "../src/artifact-content-channel";
import type { ArtifactRendererProps } from "../src/artifact-renderer-props";

export const REVISION_ID = "rev_1";

/** The data road a first-party surface hands the display. */
export const DATA_ROAD = { road: "session", apiUrl: "/api/cube" } as const;

/** The live dashboard the continued reading navigates to. */
export const OPEN_LIVE = "/dashboards/d1";

export const PORTLET_TITLES = ["Qualified pipeline", "Win rate", "Cycle time"] as const;

/** The pinned configuration: three portlets on the drawing's grid. */
export const CONFIGURATION = {
  portlets: [
    { id: "p1", title: "Qualified pipeline", chartType: "kpiNumber", x: 0, y: 0, w: 4, h: 3 },
    { id: "p2", title: "Win rate", chartType: "kpiNumber", x: 4, y: 0, w: 4, h: 3 },
    { id: "p3", title: "Cycle time", chartType: "kpiNumber", x: 8, y: 0, w: 4, h: 3 },
  ],
};

export function configurationContent(
  configuration: unknown = CONFIGURATION,
): ArtifactContentProjection {
  return {
    kind: "configuration",
    channelVersion: 1,
    representationRevisionId: REVISION_ID,
    configuration,
    digest: "sha256-pinned-configuration",
    byteLength: 512,
    projectedByteLength: 512,
    cap: 256 * 1024,
  };
}

export function noContent(
  reason: "unsupported-form" | "absent" | "over-cap",
): ArtifactContentProjection {
  return { kind: "none", channelVersion: 1, representationRevisionId: REVISION_ID, reason };
}

export function textContent(text: string): ArtifactContentProjection {
  return {
    kind: "text",
    channelVersion: 1,
    representationRevisionId: REVISION_ID,
    text,
    encoding: "utf-8",
    byteLength: text.length,
    projectedByteLength: text.length,
    cap: 256 * 1024,
    truncated: false,
  };
}

/** The first-party snapshot at version 3, with the data road and no review. */
export function props(
  content: ArtifactContentProjection = configurationContent(),
  overrides: Partial<ArtifactRendererProps> = {},
): ArtifactRendererProps {
  const base: ArtifactRendererProps = {
    propsApiVersion: 3,
    artifact: {
      id: "art_1",
      title: "Pipeline",
      objectType: "@cinatra-ai/dashboard-artifact:dashboard",
      mime: "application/vnd.cinatra.dashboard+json",
      size: 512,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ownerLevel: "workspace",
      visibility: "organization",
      sourceUrl: null,
    },
    representation: { revisionId: REVISION_ID, mime: "application/vnd.cinatra.dashboard+json" },
    urls: { preview: null, download: null },
    identity: { kind: "extension", extension: "@cinatra-ai/dashboard-artifact" },
    actions: { download: null, openInSource: null },
    content,
    data: { ...DATA_ROAD },
  };
  return { ...base, ...overrides } as ArtifactRendererProps;
}

/** The same snapshot with its `data` field removed: a surface with no data road. */
export function propsWithoutRoad(
  overrides: Partial<ArtifactRendererProps> = {},
): ArtifactRendererProps {
  const { data: _data, ...rest } = props(configurationContent(), overrides);
  return rest as ArtifactRendererProps;
}
