// The dashboard display (cinatra#3092, acceptance items 2 and 6): it draws a
// dashboard artifact's pinned configuration through the shared read-only
// composition, says that the configuration is frozen and the numbers are
// current, draws the no-series reading where the surface hands it no data road,
// and draws the live-dashboard navigation only in the continued reading of a
// review.
//
// The composition is the test-only double vitest.config.ts aliases onto its
// exact id; these arms read what the display HANDED it, never how the real
// composition draws.

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Detail from "../src/renderers/detail";
import {
  CONFIGURATION,
  DATA_ROAD,
  OPEN_LIVE,
  PORTLET_TITLES,
  REVISION_ID,
  configurationContent,
  noContent,
  props,
  propsWithoutRoad,
  textContent,
} from "./props-fixture";

const NO_SERIES_STATUS =
  "No series — this reader has no live data for this dashboard here. The layout is the pinned one; the numbers are not shown. Configuration frozen at this revision · no numbers were read.";

function doubles(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-double="read-only-composed-dashboard"]'),
  );
}

const snapshotShape = props();

/** A snapshot over the given configuration with no data road. */
function propsWithoutRoadFor(configuration: unknown): typeof snapshotShape {
  const { data: _road, ...rest } = props(configurationContent(configuration));
  return rest as typeof snapshotShape;
}

function liveLinks(): HTMLElement[] {
  return screen.queryAllByRole("link", { name: "Open live dashboard" });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("the dashboard display", () => {
  it("draws the pinned configuration through the shared read-only composition", () => {
    const { container } = render(<Detail {...props()} />);
    const found = doubles(container);
    expect(found).toHaveLength(1);
    const received = JSON.parse(found[0]!.textContent ?? "null") as Record<string, unknown>;
    expect(Object.keys(received).sort()).toEqual(["config", "dataRoad"]);
    expect(received).toEqual({ config: CONFIGURATION, dataRoad: DATA_ROAD });

    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-dashboard-artifact")).toBe("dashboard");
    expect(root.getAttribute("data-revision")).toBe(REVISION_ID);
    expect(root.getAttribute("data-props-api-version")).toBe("3");
  });

  it("says the configuration is frozen and the numbers are current", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 29, 9, 14, 0));
    const { container } = render(<Detail {...props()} />);
    const reading = container.querySelector("[data-dashboard-reading]");
    expect(reading?.textContent).toBe(
      "Configuration frozen at this revision · numbers as of 09:14 today.",
    );
  });

  it("draws no live dashboard while the review is pending", () => {
    render(<Detail {...props(undefined, { review: { reading: "pending", openLive: null } })} />);
    expect(liveLinks()).toHaveLength(0);
    cleanup();

    // A host that failed to null the address in the pending reading still gets
    // no link: the reading decides, never the address alone.
    render(<Detail {...props(undefined, { review: { reading: "pending", openLive: OPEN_LIVE } })} />);
    expect(liveLinks()).toHaveLength(0);
  });

  it("draws the live dashboard once the review is continued", () => {
    const { container } = render(
      <Detail {...props(undefined, { review: { reading: "continued", openLive: OPEN_LIVE } })} />,
    );
    const links = liveLinks();
    expect(links).toHaveLength(1);
    expect(links[0]!.getAttribute("href")).toBe(OPEN_LIVE);
    const line = container.querySelector<HTMLElement>("[data-dashboard-reading-line]");
    expect(line).not.toBeNull();
    expect(line!.contains(links[0]!)).toBe(true);
  });

  it("draws no live dashboard outside a review", () => {
    const snapshot = props();
    expect("review" in snapshot).toBe(false);
    render(<Detail {...snapshot} />);
    expect(liveLinks()).toHaveLength(0);
  });

  it("draws the no-series reading where the surface hands no data road", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { container } = render(<Detail {...propsWithoutRoad()} />);
    expect(doubles(container)).toHaveLength(0);

    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-dashboard-artifact")).toBe("no-series");
    expect(root.getAttribute("data-revision")).toBe(REVISION_ID);

    const tiles = Array.from(container.querySelectorAll<HTMLElement>("[data-dashboard-tile]"));
    expect(tiles).toHaveLength(PORTLET_TITLES.length);
    PORTLET_TITLES.forEach((title, index) => {
      expect(screen.getAllByText(title)).toHaveLength(1);
      expect(within(tiles[index]!).getByText(title)).toBeTruthy();
      expect(within(tiles[index]!).getByText("—")).toBeTruthy();
    });

    expect(screen.getByRole("status").textContent).toBe(NO_SERIES_STATUS);
    expect(fetchSpy).toHaveBeenCalledTimes(0);

    // The layout is the pinned one: each tile takes its pinned columns.
    expect(tiles.map((tile) => tile.style.gridColumn)).toEqual([
      "1 / span 4",
      "5 / span 4",
      "9 / span 4",
    ]);
    cleanup();

    // Two portlets pinned on separate full-width rows, listed out of order,
    // stay on separate full-width rows in their pinned order.
    const stacked = propsWithoutRoadFor({
      portlets: [
        { id: "b", title: "Lower", x: 0, y: 6, w: 12, h: 6 },
        { id: "a", title: "Upper", x: 0, y: 0, w: 12, h: 6 },
      ],
    });
    const second = render(<Detail {...stacked} />).container;
    const stackedTiles = Array.from(second.querySelectorAll<HTMLElement>("[data-dashboard-tile]"));
    expect(stackedTiles.map((tile) => tile.textContent)).toEqual(["Upper—", "Lower—"]);
    expect(stackedTiles.map((tile) => tile.style.gridColumn)).toEqual(["1 / span 12", "1 / span 12"]);
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it("draws a named floor, never a blank, for a snapshot it cannot draw", () => {
    const cases = [
      props(noContent("absent")),
      props(textContent("not a dashboard")),
      props(undefined, { propsApiVersion: 2 }),
      // A configuration the composition cannot lay out floors, with a data
      // road and without one, rather than reaching the composition.
      props(configurationContent({ portlets: "invalid" })),
      props(configurationContent({ portlets: [null] })),
      propsWithoutRoadFor({}),
    ];
    for (const snapshot of cases) {
      let container: HTMLElement | undefined;
      expect(() => {
        container = render(<Detail {...snapshot} />).container;
      }).not.toThrow();
      expect(doubles(container!)).toHaveLength(0);
      const floor = container!.querySelector<HTMLElement>('[data-dashboard-artifact="floor"]');
      expect(floor).not.toBeNull();
      expect(floor!.getAttribute("data-dashboard-floor")).toBeTruthy();
      expect((floor!.textContent ?? "").trim().length).toBeGreaterThan(0);
      cleanup();
    }
  });

  it("carries no header strip and no decision control", () => {
    const snapshots = [
      props(),
      props(undefined, { review: { reading: "continued", openLive: OPEN_LIVE } }),
      propsWithoutRoad(),
      props(noContent("absent")),
    ];
    for (const snapshot of snapshots) {
      const { container } = render(<Detail {...snapshot} />);
      expect(screen.queryAllByRole("heading")).toHaveLength(0);
      expect(screen.queryAllByRole("button")).toHaveLength(0);
      const text = container.textContent ?? "";
      for (const word of ["Comment", "Regenerate", "Continue"]) {
        expect(text.includes(word)).toBe(false);
      }
      expect(container.innerHTML.includes("@cinatra-ai/dashboard-artifact")).toBe(false);
      cleanup();
    }
  });
});
