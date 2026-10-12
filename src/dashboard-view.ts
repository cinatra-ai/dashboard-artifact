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
  | "configuration-without-portlets";

/** One no-series tile: a portlet's title and its pinned placement on the
 * dashboard's twelve-column grid — its columns (a CSS `grid-column` value) and
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
       *  its analytics portlet's `config.dashboard`, unchanged. */
      configuration: Record<string, unknown>;
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

/** The portlets of a drawable configuration: an array whose every entry is an
 * object, else null — the composition lays out nothing else. */
function portletsOf(configuration: Record<string, unknown>): Record<string, unknown>[] | null {
  const portlets = configuration.portlets;
  if (!Array.isArray(portlets)) return null;
  return portlets.every(isRecord) ? (portlets as Record<string, unknown>[]) : null;
}

function titleOf(portlet: Record<string, unknown>): string | null {
  const title = portlet.title;
  return typeof title === "string" && title.length > 0 ? title : null;
}

function gridUnit(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

const GRID_COLUMNS = 12;

/** The pinned column placement on the twelve-column grid; a portlet whose
 * placement is missing or out of range spans the whole row. */
function columnOf(portlet: Record<string, unknown>): string {
  const x = gridUnit(portlet.x);
  const w = gridUnit(portlet.w);
  if (x === null || w === null || w === 0 || x >= GRID_COLUMNS) return "1 / -1";
  return `${x + 1} / span ${Math.min(w, GRID_COLUMNS - x)}`;
}

/** The pinned row placement: from the portlet's row, spanning its height. A
 * portlet whose row or height is missing takes the next free row. */
function rowOf(portlet: Record<string, unknown>): string {
  const y = gridUnit(portlet.y);
  const h = gridUnit(portlet.h);
  if (y === null || h === null || h === 0) return "auto";
  return `${y + 1} / span ${h}`;
}

function tilesOf(portlets: Record<string, unknown>[]): DashboardTile[] {
  return portlets
    .map((portlet, index) => ({ portlet, index, title: titleOf(portlet) }))
    .filter((entry): entry is { portlet: Record<string, unknown>; index: number; title: string } => entry.title !== null)
    .sort((a, b) => {
      const ay = gridUnit(a.portlet.y) ?? 0;
      const by = gridUnit(b.portlet.y) ?? 0;
      if (ay !== by) return ay - by;
      const ax = gridUnit(a.portlet.x) ?? 0;
      const bx = gridUnit(b.portlet.x) ?? 0;
      return ax !== bx ? ax - bx : a.index - b.index;
    })
    .map((entry) => ({ title: entry.title, column: columnOf(entry.portlet), row: rowOf(entry.portlet) }));
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
  return {
    kind: "dashboard",
    revisionId: content.representationRevisionId,
    configuration: body,
    portletTitles: portlets.map(titleOf).filter((title): title is string => title !== null),
    tiles: tilesOf(portlets),
    dataRoad: dataRoadOf(input.data),
    openLive: openLiveOf(input.review),
  };
}
