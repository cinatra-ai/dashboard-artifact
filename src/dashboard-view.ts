// THE DECISION LEAF of the dashboard display (cinatra#3092): it maps the
// authorized host snapshot to exactly one of two outcomes, and it is the only
// place in this package that reads the content channel.
//
//   `dashboard` — the pinned configuration the revision recorded, its tiles in
//     their pinned reading order, the data road the surface handed (or none), and
//     the live-dashboard address, unless a review is still open.
//   `floor` — a NAMED reason it cannot be drawn. Never blank, never a throw: a
//     display that threw would take the surface around it down with it.
//
// TOTAL and PURE: every input returns a view, and nothing here reaches the
// network.

import { ARTIFACT_CONTENT_CHANNEL_VERSION, type ArtifactContentProjection } from "./artifact-content-channel";
import { ARTIFACT_RENDERER_PROPS_API_VERSION, type ArtifactRendererProps } from "./artifact-renderer-props";

/** Why this display is drawing a floor instead of the dashboard. */
export type DashboardFloorReason =
  | "props-version"
  | "content-not-configuration"
  | "content-channel-version"
  | "configuration-not-object"
  | "configuration-without-portlets"
  | "configuration-portlet-unreadable"
  | "configuration-grid-unreadable";

// THE COMPOSITION'S CONFIGURATION (cinatra#3092). The shared read-only
// composition hands its `config` to drizzle-cube's DashboardProvider, whose
// `DashboardConfig` REQUIRES `portlets`, and of each portlet `id`, `title`, `x`,
// `y`, `w` and `h`; every other field is optional. This package cannot see the
// host's types, so it states that required part here, and the resolver hands
// the composition a configuration only when every portlet carries it.

/** One portlet as the composition requires it. */
export type DashboardPortlet = { id: string; title: string; x: number; y: number; w: number; h: number };

/** The pinned body as the composition requires it. */
export type DashboardConfiguration = { portlets: DashboardPortlet[] };

/** One no-series tile: a portlet's title and its pinned placement on the
 * dashboard's grid: its columns (a CSS `grid-column` value) and its rows (a CSS
 * `grid-row` value). */
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
       *  its analytics portlet's `config.dashboard`. */
      configuration: DashboardConfiguration;
      /** The pinned grid's column count: `grid.cols`, twelve only when the
       *  configuration names no grid columns. */
      columns: number;
      /** The portlets in their pinned reading order (row, then column), each
       *  with its pinned placement: the layout the no-series reading draws. */
      tiles: DashboardTile[];
      /** The surface's data road, or null where it handed none. */
      dataRoad: DashboardDataRoad | null;
      /** The live-dashboard address: null while a review is open, and where the
       *  record has none. */
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
  "content-channel-version":
    "This dashboard cannot be drawn: it was handed content of a version this display does not read.",
  "configuration-not-object":
    "This dashboard cannot be drawn: the configuration handed to this view is incomplete.",
  "configuration-without-portlets":
    "This dashboard cannot be drawn: the configuration handed to this view has no portlets it can lay out.",
  "configuration-portlet-unreadable":
    "This dashboard cannot be drawn: the configuration handed to this view has a portlet it cannot lay out.",
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
// composition draws that body, never the envelope. A configuration that names no
// apiVersion is read as a body itself.
const ENVELOPE_API_VERSION = "v1.2";
const ANALYTICS_KINDS: readonly string[] = ["analytics", "cube-dashboard"];

/** The drawable body of a pinned configuration: the configuration itself where
 * it names no apiVersion, the one analytics portlet's dashboard object in an
 * envelope, and null for any other apiVersion, for an envelope without exactly one
 * analytics portlet, and for one whose dashboard is not an object. */
function analyticsBodyOf(configuration: Record<string, unknown>): Record<string, unknown> | null {
  if (configuration.apiVersion === undefined) return configuration;
  if (configuration.apiVersion !== ENVELOPE_API_VERSION) return null;
  const portlets = Array.isArray(configuration.portlets) ? configuration.portlets : [];
  const analytics = portlets.filter(
    (portlet): portlet is Record<string, unknown> =>
      isRecord(portlet) && typeof portlet.kind === "string" && ANALYTICS_KINDS.includes(portlet.kind),
  );
  if (analytics.length !== 1) return null;
  const config = analytics[0]!.config;
  const body = isRecord(config) ? config.dashboard : null;
  return isRecord(body) ? body : null;
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

function isIntegerFrom(value: unknown, minimum: number): boolean {
  return Number.isInteger(value) && (value as number) >= minimum;
}

/** The one rule for a portlet the composition can draw: an id and a title that
 * are non-empty strings, a place that is a whole number from 0, and a size that
 * is a whole number from 1. */
function isComposable(portlet: unknown): portlet is DashboardPortlet {
  return (
    isRecord(portlet) &&
    isNonEmptyString(portlet.id) &&
    isNonEmptyString(portlet.title) &&
    isIntegerFrom(portlet.x, 0) &&
    isIntegerFrom(portlet.y, 0) &&
    isIntegerFrom(portlet.w, 1) &&
    isIntegerFrom(portlet.h, 1)
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

/** The pinned column placement on the pinned grid of `columns` columns. A
 * portlet whose column lies past the grid spans the whole row, and one wider than
 * the columns left is cut at the grid's edge. */
function columnOf(portlet: DashboardPortlet, columns: number): string {
  const { x, w } = portlet;
  if (x >= columns) return "1 / -1";
  return `${x + 1} / span ${Math.min(w, columns - x)}`;
}

/** The pinned row placement: from the portlet's row, spanning its height. */
function rowOf(portlet: DashboardPortlet): string {
  return `${portlet.y + 1} / span ${portlet.h}`;
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

// specs/app-artifact-review.html §XI.5: the review state alone decides Open live
// dashboard. It is drawn once a review is continued and where no review stands,
// and never while a decision is open. "Open live uses artifact.sourceUrl." A
// `review` that is present and not a reading this display knows is treated as an
// open review: no link.
function openLiveOf(review: unknown, artifact: unknown): string | null {
  const reviewAllows = review === undefined || (isRecord(review) && review.reading === "continued");
  if (!reviewAllows || !isRecord(artifact)) return null;
  return liveAddressOf(artifact.sourceUrl);
}

// The address reaches an href, so it passes one closed rule. Its characters are
// the characters of RFC 3986, so a space, a control character, a backslash and any
// character outside ASCII refuse it: a browser drops or rewrites some of these, and
// "/\t/host" or "/\\host" would leave the application. Its form is a root-relative
// path, or an absolute http(s) address that parses and whose authority part holds
// a host and no user part, not even an empty one.
const ADDRESS_CHARACTERS = /^[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
const ABSOLUTE_ADDRESS = /^https?:\/\/[^/?#@]+(?:[/?#]|$)/i;

function liveAddressOf(sourceUrl: unknown): string | null {
  if (typeof sourceUrl !== "string" || !ADDRESS_CHARACTERS.test(sourceUrl)) return null;
  if (/^\/(?!\/)/.test(sourceUrl)) return sourceUrl;
  if (!ABSOLUTE_ADDRESS.test(sourceUrl)) return null;
  try {
    new URL(sourceUrl);
    return sourceUrl;
  } catch {
    return null;
  }
}

/** Resolve the snapshot to the one view this display draws. */
export function resolveDashboardView(input: DashboardViewInput): DashboardView {
  if (!isRecord(input)) return { kind: "floor", reason: "props-version" };
  const version = input.propsApiVersion;
  if (!Number.isFinite(version) || (version as number) < ARTIFACT_RENDERER_PROPS_API_VERSION) {
    return { kind: "floor", reason: "props-version" };
  }
  const content = input.content as ArtifactContentProjection | undefined;
  if (!isRecord(content) || content.kind !== "configuration") {
    return { kind: "floor", reason: "content-not-configuration" };
  }
  // A projection of another channel version is refused, never read at the
  // wrong shape.
  if (content.channelVersion !== ARTIFACT_CONTENT_CHANNEL_VERSION) {
    return { kind: "floor", reason: "content-channel-version" };
  }
  if (!isRecord(content.configuration)) {
    return { kind: "floor", reason: "configuration-not-object" };
  }
  const body = analyticsBodyOf(content.configuration);
  const portlets = body === null ? null : body.portlets;
  if (body === null || !Array.isArray(portlets) || portlets.length === 0) {
    return { kind: "floor", reason: "configuration-without-portlets" };
  }
  // "The layout is the pinned one", so a layout that lost a portlet is no reading:
  // one portlet the composition cannot draw floors the whole configuration.
  if (!portlets.every(isComposable) || new Set(portlets.map((portlet) => portlet.id)).size !== portlets.length) {
    return { kind: "floor", reason: "configuration-portlet-unreadable" };
  }
  const columns = gridColumnsOf(body);
  if (columns === null) {
    return { kind: "floor", reason: "configuration-grid-unreadable" };
  }
  return {
    kind: "dashboard",
    revisionId: content.representationRevisionId,
    configuration: { ...body, portlets },
    columns,
    tiles: tilesOf(portlets, columns),
    dataRoad: dataRoadOf(input.data),
    openLive: openLiveOf(input.review, input.artifact),
  };
}
