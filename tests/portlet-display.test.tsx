// The portlet display (specs/app-artifact-review.html §XI.6, cinatra#3092): one
// entry of a dashboard, addressable on its own. The same `detail` renderer draws
// it when the row's object type is the portlet type, through the composition's
// single-portlet view, with the line that says which dashboard, which dashboard
// revision and which entry it was cut from. Inside a review the live dashboard
// link is drawn only once the review is continued.

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Detail from "../src/renderers/detail";
import type { ArtifactRendererProps } from "../src/artifact-renderer-props";
import { dashboardFloorMessage, resolvePortletView } from "../src/dashboard-view";
import { DASHBOARD_PORTLET_MEDIA_TYPE, DASHBOARD_PORTLET_OBJECT_TYPE } from "../src/object-types";
import {
  CONFIGURATION,
  DATA_ROAD,
  OPEN_LIVE,
  configurationContent,
  props,
  storedEnvelope,
  textContent,
} from "./props-fixture";

const PORTLET_REVISION = "rev_portlet_1";
const CUT = {
  dashboardId: "d1",
  dashboardTitle: "Pipeline health — Q3",
  dashboardRevisionId: "rev_2e77",
  portletInstanceId: "p2",
} as const;

const PENDING = { reading: "pending", openLive: null } as const;
const CONTINUED = { reading: "continued", openLive: OPEN_LIVE } as const;
const PANEL = '[data-conformance-id="portlet-display"]';
const ENTRY_BINDING = '[data-field="entry=representation.portlet-instance-id"]';
const OPEN_LIVE_BINDING = '[data-field="open-live=artifact.sourceUrl"]';
const OPEN_LIVE_ACTION = "open-live-dashboard -> dashboard-canonical";

function cutRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...CUT, configuration: storedEnvelope(CONFIGURATION), ...overrides };
}

function portletContent(record: unknown = cutRecord()) {
  return { ...configurationContent(record), representationRevisionId: PORTLET_REVISION };
}

function portletProps(
  overrides: Partial<ArtifactRendererProps> = {},
  record: unknown = cutRecord(),
): ArtifactRendererProps {
  const base = props(portletContent(record) as ArtifactRendererProps["content"]);
  return {
    ...base,
    artifact: {
      ...base.artifact,
      title: "Qualified pipeline — Q3",
      objectType: DASHBOARD_PORTLET_OBJECT_TYPE,
      mime: DASHBOARD_PORTLET_MEDIA_TYPE,
      sourceUrl: OPEN_LIVE,
    },
    representation: { revisionId: PORTLET_REVISION, mime: DASHBOARD_PORTLET_MEDIA_TYPE },
    ...overrides,
  };
}

function withoutRoad(snapshot: ArtifactRendererProps): ArtifactRendererProps {
  const { data: _data, ...rest } = snapshot;
  return rest as ArtifactRendererProps;
}

function handed(container: HTMLElement, double: string): Record<string, unknown>[] {
  return Array.from(container.querySelectorAll(`[data-double="${double}"]`)).map(
    (node) => JSON.parse(node.textContent ?? "{}") as Record<string, unknown>,
  );
}

afterEach(() => {
  cleanup();
});

describe("the portlet branch", () => {
  it("draws a portlet row through the single-portlet composition, narrowed to its entry", () => {
    const { container } = render(<Detail {...portletProps()} />);
    expect(container.querySelectorAll(PANEL)).toHaveLength(1);
    expect(container.querySelector('[data-conformance-id="dashboard-display"]')).toBeNull();
    expect(handed(container, "read-only-composed-dashboard")).toHaveLength(0);

    const singles = handed(container, "read-only-single-portlet");
    expect(singles).toEqual([{ config: CONFIGURATION, portletId: "p2", dataRoad: DATA_ROAD }]);

    const panel = container.querySelector<HTMLElement>(PANEL)!;
    expect(panel.getAttribute("data-kind")).toBe("artifact");
    expect(panel.getAttribute("data-dashboard-artifact")).toBe("portlet");
    expect(panel.getAttribute("data-revision")).toBe(PORTLET_REVISION);
  });

  it("keeps drawing a dashboard row as the whole dashboard", () => {
    const { container } = render(<Detail {...props()} />);
    expect(container.querySelector(PANEL)).toBeNull();
    expect(handed(container, "read-only-single-portlet")).toHaveLength(0);
    expect(handed(container, "read-only-composed-dashboard")).toHaveLength(1);
  });

  it("reads a cut whose configuration is a body, not an envelope", () => {
    const { container } = render(<Detail {...portletProps({}, cutRecord({ configuration: CONFIGURATION }))} />);
    expect(handed(container, "read-only-single-portlet")[0]?.portletId).toBe("p2");
  });
});

describe("the cut line", () => {
  it("says which dashboard, which dashboard revision and which entry it was cut from", () => {
    const { container } = render(<Detail {...portletProps()} />);
    const cut = container.querySelector<HTMLElement>("[data-portlet-cut]")!;
    expect(cut.textContent).toBe("Cut from Pipeline health — Q3 at revision rev_2e77 · entry p2");
    expect(cut.getAttribute("data-dashboard-id")).toBe("d1");

    const entries = container.querySelectorAll(`${PANEL} ${ENTRY_BINDING}`);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.textContent).toBe("p2");
  });

  it("draws the cut line and the reading in one paragraph, the cut first", () => {
    const { container } = render(<Detail {...portletProps({ review: PENDING })} />);
    const line = container.querySelector<HTMLElement>("[data-dashboard-reading-line]")!;
    expect(line.querySelector("[data-portlet-cut]")).not.toBeNull();
    expect(line.querySelector("br")).not.toBeNull();
    expect(line.textContent).toMatch(
      /^Cut from Pipeline health — Q3 at revision rev_2e77 · entry p2Configuration frozen at this revision · numbers as of \d{2}:\d{2} today\.$/,
    );
  });
});

type Reading = { name: string; snapshot: ArtifactRendererProps; numbers: boolean; link: boolean };

const READINGS: readonly Reading[] = [
  { name: "the review open", snapshot: portletProps({ review: PENDING }), numbers: true, link: false },
  { name: "the review continued", snapshot: portletProps({ review: CONTINUED }), numbers: true, link: true },
  { name: "no review standing", snapshot: portletProps(), numbers: true, link: true },
  { name: "the review open, no data capability", snapshot: withoutRoad(portletProps({ review: PENDING })), numbers: false, link: false },
  { name: "the review continued, no data capability", snapshot: withoutRoad(portletProps({ review: CONTINUED })), numbers: false, link: true },
];

describe("the readings of the portlet display", () => {
  it.each(READINGS)("$name", ({ snapshot, numbers, link }) => {
    const { container } = render(<Detail {...snapshot} />);
    const panels = container.querySelectorAll(PANEL);
    expect(panels).toHaveLength(1);
    const panel = panels[0]!;
    expect(panel.getAttribute("data-dashboard-artifact")).toBe(numbers ? "portlet" : "no-series");
    expect(handed(container, "read-only-single-portlet")).toHaveLength(numbers ? 1 : 0);
    expect(panel.querySelectorAll(ENTRY_BINDING)).toHaveLength(1);

    const bound = panel.querySelectorAll<HTMLAnchorElement>(OPEN_LIVE_BINDING);
    expect(bound).toHaveLength(link ? 1 : 0);
    expect(screen.queryAllByRole("link", { name: "Open live dashboard" })).toHaveLength(link ? 1 : 0);
    if (link) {
      expect(bound[0]!.getAttribute("href")).toBe(OPEN_LIVE);
      expect(bound[0]!.getAttribute("data-action")).toBe(OPEN_LIVE_ACTION);
    }
  });

  it("draws no live link for a review reading it does not know", () => {
    const review = { reading: "settled", openLive: OPEN_LIVE } as unknown as ArtifactRendererProps["review"];
    const { container } = render(<Detail {...portletProps({ review })} />);
    expect(container.querySelectorAll(OPEN_LIVE_BINDING)).toHaveLength(0);
  });

  it("reads the address from the artifact record, never from the review reading", () => {
    const review = { reading: "continued", openLive: "/elsewhere" } as const;
    const { container } = render(<Detail {...portletProps({ review })} />);
    expect(container.querySelector(OPEN_LIVE_BINDING)?.getAttribute("href")).toBe(OPEN_LIVE);
  });

  it("draws the one entry's title, and no number, without a data road", () => {
    const { container } = render(<Detail {...withoutRoad(portletProps())} />);
    const tiles = container.querySelectorAll("[data-dashboard-tile]");
    expect(tiles).toHaveLength(1);
    expect(tiles[0]!.textContent).toBe("Win rate—");
    expect(screen.getByRole("status").textContent).toMatch(/^No series — /);
    expect(container.querySelector("[data-portlet-cut]")).not.toBeNull();
  });
});

describe("the portlet floors", () => {
  const floorOf = (snapshot: ArtifactRendererProps) => {
    const { container } = render(<Detail {...snapshot} />);
    const floor = container.querySelector<HTMLElement>(`${PANEL}[data-dashboard-artifact="floor"]`);
    expect(floor).not.toBeNull();
    expect(handed(container, "read-only-single-portlet")).toHaveLength(0);
    return floor!;
  };

  it.each(["dashboardId", "dashboardTitle", "dashboardRevisionId", "portletInstanceId"])(
    "floors a cut without %s",
    (fact) => {
      const floor = floorOf(portletProps({}, cutRecord({ [fact]: "" })));
      expect(floor.getAttribute("data-dashboard-floor")).toBe("portlet-cut-unreadable");
      cleanup();
      const missing = cutRecord();
      delete missing[fact];
      expect(floorOf(portletProps({}, missing)).getAttribute("data-dashboard-floor")).toBe("portlet-cut-unreadable");
    },
  );

  it("floors a cut whose configuration does not hold its entry", () => {
    const floor = floorOf(portletProps({}, cutRecord({ portletInstanceId: "p9" })));
    expect(floor.getAttribute("data-dashboard-floor")).toBe("portlet-entry-missing");
    expect(floor.textContent).toBe(dashboardFloorMessage("portlet-entry-missing"));
  });

  it("floors a cut without a configuration object, naming the portlet", () => {
    const floor = floorOf(portletProps({}, cutRecord({ configuration: null })));
    expect(floor.getAttribute("data-dashboard-floor")).toBe("configuration-not-object");
    expect(floor.textContent).toMatch(/^This portlet cannot be drawn: /);
  });

  it("floors content of another kind and an older snapshot", () => {
    expect(
      floorOf(portletProps({ content: textContent("x") })).getAttribute("data-dashboard-floor"),
    ).toBe("content-not-configuration");
    cleanup();
    expect(floorOf(portletProps({ propsApiVersion: 4 })).getAttribute("data-dashboard-floor")).toBe("props-version");
  });

  it("is total: a missing input resolves to a floor, never a throw", () => {
    expect(resolvePortletView(undefined)).toEqual({ kind: "floor", reason: "props-version" });
    expect(resolvePortletView(null)).toEqual({ kind: "floor", reason: "props-version" });
  });
});
