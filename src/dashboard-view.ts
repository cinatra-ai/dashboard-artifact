// THE DECISION LEAF of the dashboard display (cinatra#3092): it maps the
// authorized host snapshot to exactly one of two outcomes, and it is the only
// place in this package that reads the content channel.
//
//   `dashboard` — the pinned configuration the revision recorded, the portlet
//     titles in its order, the data road the surface handed (or none), and the
//     live-dashboard address ONLY in the continued reading of a review.
//   `floor` — a NAMED reason it cannot be drawn. Never blank, never a throw: a
//     display that threw would take the surface around it down with it.
//
// TOTAL and PURE: every input returns a view, and nothing here reaches the
// network.

import type { ArtifactContentProjection } from "./artifact-content-channel";
import { ARTIFACT_RENDERER_PROPS_API_VERSION, type ArtifactRendererProps } from "./artifact-renderer-props";

/** Why this display is drawing a floor instead of the dashboard. */
export type DashboardFloorReason =
  | "props-version"
  | "content-not-configuration"
  | "configuration-not-object"
  | "configuration-without-portlets"
  | "configuration-grid-unreadable";

// THE COMPOSITION'S CONFIGURATION (cinatra#3092). The shared read-only
// composition hands its `config` to drizzle-cube's DashboardProvider, whose
// `DashboardConfig` REQUIRES `portlets`, and of each portlet `id`, `title`, `x`,
// `y`, `w` and `h`; every other field is optional. This package cannot see the
// host's types, so it states that required part here, and the resolver hands
// the composition only portlets that carry it, the rule by which the host's
// own render path drops a portlet it cannot draw and keeps its siblings.

/** One portlet as the composition requires it. */
export type DashboardPortlet = { id: string; title: string; x: number; y: number; w: number; h: number };

/** The pinned body as the composition requires it. */
export type DashboardConfiguration = { portlets: DashboardPortlet[] };

/** One no-series tile: a portlet's title and its pinned placement on the
 * dashboard's grid — its columns (a CSS `grid-column` value) and
 * its rows (a CSS `grid-row` value), so two portlets pinned on different rows
 * never share one. */
export type DashboardTile = { title: string; column: string; row: string };

/** The data road the display hands the shared read-only composition. */
export type DashboardDataRoad = { road: "session"; apiUrl: string };

/** What this display can be showing. */
export type DashboardView =
  | {
      kind: "dashboard";
      /** The revision the configuration was pinned at. */
      revisionId: string;
      /** The analytics body of the pinned configuration — the dashboard the
       *  composition draws. The host pins the whole stored envelope; this is
       *  its analytics portlet's `config.dashboard`, with only the portlets
       *  the composition can draw. */
      configuration: DashboardConfiguration;
      /** The pinned grid's column count: `grid.cols`, twelve only when the
       *  configuration names no grid columns. */
      columns: number;
      /** Each portlet's title, in the configuration's order; empty ones skipped. */
      portletTitles: string[];
      /** The titled portlets in their pinned reading order (row, then column),
       *  each with its pinned column placement — the layout the no-series
       *  reading draws. */
      tiles: DashboardTile[];
      /** The surface's data road, or null where it handed none. */
      dataRoad: DashboardDataRoad | null;
      /** The live-dashboard address, ONLY in the continued reading. */
      openLive: string | null;
    }
  | { kind: "floor"; reason: DashboardFloorReason };

/** A display must never throw on a shape it did not expect, so the input is
 * accepted loosely and every surprise lands on the floor. */
export type DashboardViewInput = Partial<ArtifactRendererProps> | null | undefined;

const FLOOR_MESSAGES: Record<DashboardFloorReason, string> = {
  "props-version":
    "This dashboard cannot be drawn: it was handed a snapshot of a version this display does not read.",
  "content-not-configuration":
    "This dashboard cannot be drawn here: this view was not given a pinned configuration to show.",
  "configuration-not-object":
    "This dashboard cannot be drawn: the configuration handed to this view is incomplete.",
  "configuration-without-portlets":
    "This dashboard cannot be drawn: the configuration handed to this view has no portlets it can lay out.",
  "configuration-grid-unreadable":
    "This dashboard cannot be drawn: the configuration handed to this view has a grid it cannot lay out.",
};

/** The sentence a floor draws for its reason. */
export function dashboardFloorMessage(reason: DashboardFloorReason): string {
  return FLOOR_MESSAGES[reason];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// THE STORED ENVELOPE (cinatra#3092). The host pins the dashboard's
// configuration AS STORED: the apiVersion 1.2 envelope, whose analytics
// portlet (kind `analytics`, or its alias `cube-dashboard`, matched by kind and
// never by instanceId) carries the drawable dashboard at `config.dashboard`. The
// composition draws that body, never the envelope. A configuration without the
// envelope's apiVersion is read as a body itself.
const ENVELOPE_API_VERSION = "v1.2";
const ANALYTICS_KINDS: readonly string[] = ["analytics", "cube-dashboard"];

/** The drawable body of a pinned configuration, or null when an envelope
 * carries no analytics portlet with a dashboard object. */
function analyticsBodyOf(configuration: Record<string, unknown>): Record<string, unknown> | null {
  if (configuration.apiVersion !== ENVELOPE_API_VERSION) return configuration;
  const portlets = Array.isArray(configuration.portlets) ? configuration.portlets : [];
  const analytics = portlets.find(
    (portlet): portlet is Record<string, unknown> =>
      isRecord(portlet) && typeof portlet.kind === "string" && ANALYTICS_KINDS.includes(portlet.kind),
  );
  const config = analytics === undefined ? null : analytics.config;
  const body = isRecord(config) ? config.dashboard : null;
  return isRecord(body) ? body : null;
}

/** The portlets of a drawable configuration: the object entries of its
 * portlets array, else null. An entry that is not an object is a portlet the
 * composition cannot draw: it is left out and its siblings are kept. */
function portletsOf(configuration: Record<string, unknown>): Record<string, unknown>[] | null {
  const portlets = configuration.portlets;
  if (!Array.isArray(portlets)) return null;
  return portlets.filter(isRecord);
}

/** Whether a portlet carries every field the composition requires of it. */
function isComposable(portlet: Record<string, unknown>): portlet is Record<string, unknown> & DashboardPortlet {
  return (
    typeof portlet.id === "string" &&
    portlet.id.length > 0 &&
    titleOf(portlet) !== null &&
    gridUnit(portlet.x) !== null &&
    gridUnit(portlet.y) !== null &&
    gridUnit(portlet.w) !== null &&
    gridUnit(portlet.h) !== null
  );
}

const DEFAULT_GRID_COLUMNS = 12;

/** The pinned grid's column count: `grid.cols` when the configuration names
 * it, twelve only when it names none; null for a grid it cannot lay out. */
function gridColumnsOf(body: Record<string, unknown>): number | null {
  if (body.grid === undefined) return DEFAULT_GRID_COLUMNS;
  if (!isRecord(body.grid)) return null;
  const cols = body.grid.cols;
  if (cols === undefined) return DEFAULT_GRID_COLUMNS;
  return typeof cols === "number" && Number.isInteger(cols) && cols > 0 ? cols : null;
}

function titleOf(portlet: Record<string, unknown>): string | null {
  const title = portlet.title;
  return typeof title === "string" && title.length > 0 ? title : null;
}

function gridUnit(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/** The pinned column placement on the pinned grid of `columns` columns; a
 * portlet whose placement is out of range spans the whole row. */
function columnOf(portlet: DashboardPortlet, columns: number): string {
  const { x, w } = portlet;
  if (w === 0 || x >= columns) return "1 / -1";
  return `${x + 1} / span ${Math.min(w, columns - x)}`;
}

/** The pinned row placement: from the portlet's row, spanning its height. A
 * portlet whose row or height is missing takes the next free row. */
function rowOf(portlet: DashboardPortlet): string {
  const { y, h } = portlet;
  if (h === 0) return "auto";
  return `${y + 1} / span ${h}`;
}

function tilesOf(portlets: DashboardPortlet[], columns: number): DashboardTile[] {
  return portlets
    .map((portlet, index) => ({ portlet, index }))
    .sort((a, b) => {
      if (a.portlet.y !== b.portlet.y) return a.portlet.y - b.portlet.y;
      return a.portlet.x !== b.portlet.x ? a.portlet.x - b.portlet.x : a.index - b.index;
    })
    .map(({ portlet }) => ({ title: portlet.title, column: columnOf(portlet, columns), row: rowOf(portlet) }));
}

function dataRoadOf(data: unknown): DashboardDataRoad | null {
  if (!isRecord(data)) return null;
  if (data.road !== "session") return null;
  if (typeof data.apiUrl !== "string" || data.apiUrl.length === 0) return null;
  return { road: "session", apiUrl: data.apiUrl };
}

// cinatra#3092, acceptance 6: the live-dashboard navigation is absent in the
// pending reading and present in the continued one. A pending reading draws no
// link even if a host sent an address.
function openLiveOf(review: unknown): string | null {
  if (!isRecord(review)) return null;
  if (review.reading !== "continued") return null;
  if (typeof review.openLive !== "string" || review.openLive.length === 0) return null;
  return review.openLive;
}

/** Resolve the snapshot to the one view this display draws. */
export function resolveDashboardView(input: DashboardViewInput): DashboardView {
  if (!isRecord(input)) return { kind: "floor", reason: "props-version" };
  const version = input.propsApiVersion;
  if (typeof version !== "number" || version < ARTIFACT_RENDERER_PROPS_API_VERSION) {
    return { kind: "floor", reason: "props-version" };
  }
  const content = input.content as ArtifactContentProjection | undefined;
  if (!isRecord(content) || content.kind !== "configuration") {
    return { kind: "floor", reason: "content-not-configuration" };
  }
  if (!isRecord(content.configuration)) {
    return { kind: "floor", reason: "configuration-not-object" };
  }
  const body = analyticsBodyOf(content.configuration);
  const portlets = body === null ? null : portletsOf(body);
  if (body === null || portlets === null) {
    return { kind: "floor", reason: "configuration-without-portlets" };
  }
  const composable = portlets.filter(isComposable);
  // Portlets listed, none of them drawable: nothing for the composition to lay out.
  if (composable.length === 0 && Array.isArray(body.portlets) && body.portlets.length > 0) {
    return { kind: "floor", reason: "configuration-without-portlets" };
  }
  const columns = gridColumnsOf(body);
  if (columns === null) {
    return { kind: "floor", reason: "configuration-grid-unreadable" };
  }
  return {
    kind: "dashboard",
    revisionId: content.representationRevisionId,
    configuration: { ...body, portlets: composable },
    columns,
    portletTitles: composable.map((portlet) => portlet.title),
    tiles: tilesOf(composable, columns),
    dataRoad: dataRoadOf(input.data),
    openLive: openLiveOf(input.review),
  };
}
