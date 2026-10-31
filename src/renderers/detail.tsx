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
//     numbers, and the live dashboard unless a review is still open);
//   - without a data road, the no-series reading: the pinned layout's titles,
//     each over an em dash in the number's place, the status sentence, and the
//     same live dashboard rule. It mounts no composition and fetches nothing;
//   - a snapshot it cannot draw becomes a NAMED floor, never a blank.
//
// NO HEADER STRIP: the display draws the work and nothing about itself — no
// heading, no button, no download and no package name.
//
// NO CONTINUATION SENTENCE: the drawing's "The dashboard is live from here." is a
// claim about a remote effect, and "A display draws no typed sentence when a fact
// it needs is missing" (specs/app-artifact-review.html §XI). The host hands no
// `review.effect.record` at this props version, so the sentence is not drawn.

import type { ReactElement } from "react";

import { ReadOnlyComposedDashboard } from "@cinatra-ai/sdk-dashboard/components";

import {
  ARTIFACT_RENDERER_PROPS_API_VERSION,
  type ArtifactRendererProps,
} from "../artifact-renderer-props";
import { dashboardFloorMessage, resolveDashboardView } from "../dashboard-view";
import OpenLiveLink from "./open-live-link";
import ReadingLine from "./reading-line";

const DISPLAY_ID = "dashboard-display";
const LAYOUT_BINDING = "layout=representation.pinned-configuration";

const NO_SERIES_STATUS =
  "No series — this reader has no live data for this dashboard here. The layout is the pinned one; the numbers are not shown. Configuration frozen at this revision · no numbers were read.";

export default function DashboardArtifactDetail(props: ArtifactRendererProps): ReactElement {
  const view = resolveDashboardView(props);
  if (view.kind === "floor") {
    return (
      <article
        className="soft-panel rounded-card overflow-hidden p-6"
        data-conformance-id={DISPLAY_ID}
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
        data-conformance-id={DISPLAY_ID}
        data-dashboard-artifact="no-series"
        data-revision={view.revisionId}
        data-props-api-version={ARTIFACT_RENDERER_PROPS_API_VERSION}
      >
        <div
          className="grid gap-4"
          data-field={LAYOUT_BINDING}
          style={{ gridTemplateColumns: `repeat(${view.columns}, minmax(0, 1fr))` }}
        >
          {view.tiles.map((tile, index) => (
            <div
              key={`${index}-${tile.title}`}
              className="soft-panel rounded-card p-4"
              style={{ gridColumn: tile.column, gridRow: tile.row }}
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
            <OpenLiveLink href={view.openLive} />
          </p>
        ) : null}
      </article>
    );
  }

  return (
    <article
      className="overflow-hidden"
      data-conformance-id={DISPLAY_ID}
      data-dashboard-artifact="dashboard"
      data-revision={view.revisionId}
      data-props-api-version={ARTIFACT_RENDERER_PROPS_API_VERSION}
    >
      <div data-field={LAYOUT_BINDING}>
        <ReadOnlyComposedDashboard config={view.configuration} dataRoad={view.dataRoad} />
      </div>
      <ReadingLine openLive={view.openLive} />
    </article>
  );
}
