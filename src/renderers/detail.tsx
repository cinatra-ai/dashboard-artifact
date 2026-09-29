// Dashboard detail renderer (slot `detail`, cinatra#3092).
//
// It draws a dashboard artifact's PINNED configuration — the one the revision
// recorded — through the shared read-only composition the application serves:
// the same layout and the same portlets a person sees on the dashboard's own
// home, as a view. No toolbar, no filters, no drag, no save, and no decision
// affordance: the composition mounts none, and this display adds none.
//
// THREE READINGS, one resolver (`../dashboard-view`):
//   - with a data road, the composition over the pinned configuration and that
//     road, and beneath it the reading line (frozen configuration, current
//     numbers, and the live dashboard only in the continued reading);
//   - without a data road, the no-series reading: the pinned layout's titles,
//     each over an em dash in the number's place, and the status sentence. It
//     mounts no composition and fetches nothing;
//   - a snapshot it cannot draw becomes a NAMED floor, never a blank.
//
// NO HEADER STRIP: the display draws the work and nothing about itself — no
// heading, no button, no download and no package name.

import type { ReactElement } from "react";

import { ReadOnlyComposedDashboard } from "@cinatra-ai/sdk-dashboard/components";

import {
  ARTIFACT_RENDERER_PROPS_API_VERSION,
  type ArtifactRendererProps,
} from "../artifact-renderer-props";
import { dashboardFloorMessage, resolveDashboardView } from "../dashboard-view";
import ReadingLine from "./reading-line";

const NO_SERIES_STATUS =
  "No series — this reader has no live data for this dashboard here. The layout is the pinned one; the numbers are not shown. Configuration frozen at this revision · no numbers were read.";

export default function DashboardArtifactDetail(props: ArtifactRendererProps): ReactElement {
  const view = resolveDashboardView(props);
  if (view.kind === "floor") {
    return (
      <article
        className="soft-panel rounded-card overflow-hidden p-6"
        data-dashboard-artifact="floor"
        data-dashboard-floor={view.reason}
        data-props-api-version={ARTIFACT_RENDERER_PROPS_API_VERSION}
      >
        <p className="text-sm text-muted-foreground">{dashboardFloorMessage(view.reason)}</p>
      </article>
    );
  }

  if (view.dataRoad === null) {
    // cinatra#3092, acceptance 2, the no-series reading: chrome, titles and
    // layout, and no numbers.
    return (
      <article
        className="overflow-hidden"
        data-dashboard-artifact="no-series"
        data-revision={view.revisionId}
        data-props-api-version={ARTIFACT_RENDERER_PROPS_API_VERSION}
      >
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
        >
          {view.tiles.map((tile, index) => (
            <div
              key={`${index}-${tile.title}`}
              className="soft-panel rounded-card p-4"
              style={{ gridColumn: tile.column }}
              data-dashboard-tile=""
            >
              <p className="text-sm text-muted-foreground">{tile.title}</p>
              <p className="mt-2 text-2xl font-semibold">—</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          {NO_SERIES_STATUS}
        </p>
        {view.openLive !== null ? (
          <p className="mt-1 text-xs">
            <a href={view.openLive} className="underline underline-offset-2">
              Open live dashboard
            </a>
          </p>
        ) : null}
      </article>
    );
  }

  return (
    <article
      className="overflow-hidden"
      data-dashboard-artifact="dashboard"
      data-revision={view.revisionId}
      data-props-api-version={ARTIFACT_RENDERER_PROPS_API_VERSION}
    >
      <ReadOnlyComposedDashboard config={view.configuration} dataRoad={view.dataRoad} />
      <ReadingLine openLive={view.openLive} />
    </article>
  );
}
