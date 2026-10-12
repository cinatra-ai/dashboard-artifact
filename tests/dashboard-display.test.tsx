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
  PINNED_CONFIGURATION,
  PORTLET_TITLES,
  REVISION_ID,
  configurationContent,
  noContent,
  props,
  propsWithoutRoad,
  storedEnvelope,
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

  it("draws the analytics body of the stored envelope, never the envelope", () => {
    // The default snapshot pins the envelope the writer stores.
    const pinned = props();
    expect(pinned.content).toMatchObject({ configuration: PINNED_CONFIGURATION });

    const { container } = render(<Detail {...pinned} />);
    const found = doubles(container);
    expect(found).toHaveLength(1);
    const received = JSON.parse(found[0]!.textContent ?? "null") as Record<string, unknown>;
    expect(received.config).toEqual(CONFIGURATION);
    expect(received.config).not.toHaveProperty("apiVersion");
    cleanup();

    // The analytics portlet is found by its kind, the alias included, beside
    // another portlet and under another instance id.
    const aliased = storedEnvelope(CONFIGURATION, (analytics) => [
      { instanceId: "launch", kind: "launcher", version: "1.0.0", slot: "fixed", config: {} },
      { ...analytics, instanceId: "main", kind: "cube-dashboard" },
    ]);
    const second = render(<Detail {...props(configurationContent(aliased))} />).container;
    const aliasedReceived = JSON.parse(doubles(second)[0]!.textContent ?? "null") as Record<string, unknown>;
    expect(aliasedReceived.config).toEqual(CONFIGURATION);
  });

  it("draws the no-series tiles of the stored envelope's analytics body", () => {
    const { container } = render(<Detail {...propsWithoutRoadFor(PINNED_CONFIGURATION)} />);
    const tiles = Array.from(container.querySelectorAll<HTMLElement>("[data-dashboard-tile]"));
    expect(tiles.map((tile) => tile.textContent)).toEqual(PORTLET_TITLES.map((title) => `${title}—`));
  });

  it("floors a stored envelope that carries no drawable analytics body", () => {
    const cases = [
      storedEnvelope(CONFIGURATION, () => [
        { instanceId: "launch", kind: "launcher", version: "1.0.0", slot: "fixed", config: {} },
      ]),
      storedEnvelope(undefined),
      storedEnvelope("not a dashboard"),
      storedEnvelope({ portlets: "invalid" }),
    ];
    for (const configuration of cases) {
      for (const snapshot of [props(configurationContent(configuration)), propsWithoutRoadFor(configuration)]) {
        const { container } = render(<Detail {...snapshot} />);
        expect(doubles(container)).toHaveLength(0);
        const floor = container.querySelector<HTMLElement>('[data-dashboard-artifact="floor"]');
        expect(floor?.getAttribute("data-dashboard-floor")).toBe("configuration-without-portlets");
        cleanup();
      }
    }
  });

  it("keeps each tile's pinned rows, so tiles on different rows never share one", () => {
    // Portlets at (x 0, y 0, w 4) and (x 4, y 6, w 4): their columns do not
    // overlap, so only their rows keep the lower one off the upper one's row.
    const { container } = render(
      <Detail
        {...propsWithoutRoadFor({
          portlets: [
            { id: "a", title: "Upper left", x: 0, y: 0, w: 4, h: 3 },
            { id: "b", title: "Lower middle", x: 4, y: 6, w: 4, h: 2 },
          ],
        })}
      />,
    );
    const tiles = Array.from(container.querySelectorAll<HTMLElement>("[data-dashboard-tile]"));
    expect(tiles.map((tile) => tile.textContent)).toEqual(["Upper left—", "Lower middle—"]);
    expect(tiles.map((tile) => tile.style.gridColumn)).toEqual(["1 / span 4", "5 / span 4"]);
    expect(tiles.map((tile) => tile.style.gridRow)).toEqual(["1 / span 3", "7 / span 2"]);
  });

  it("lays the tiles out on the pinned grid's own column count", () => {
    // A 24-column grid with two adjacent 12-column tiles: each keeps its own
    // half, and the grid draws 24 columns.
    const { container } = render(
      <Detail
        {...propsWithoutRoadFor(
          storedEnvelope({
            grid: { cols: 24, rowHeight: 80, minW: 2, minH: 2 },
            portlets: [
              { id: "l", title: "Left half", x: 0, y: 0, w: 12, h: 3 },
              { id: "r", title: "Right half", x: 12, y: 0, w: 12, h: 3 },
            ],
          }),
        )}
      />,
    );
    const tiles = Array.from(container.querySelectorAll<HTMLElement>("[data-dashboard-tile]"));
    expect(tiles.map((tile) => tile.textContent)).toEqual(["Left half—", "Right half—"]);
    expect(tiles.map((tile) => tile.style.gridColumn)).toEqual(["1 / span 12", "13 / span 12"]);
    expect(tiles.map((tile) => tile.style.gridRow)).toEqual(["1 / span 3", "1 / span 3"]);
    expect(tiles[0]!.parentElement!.style.gridTemplateColumns).toBe("repeat(24, minmax(0, 1fr))");
    cleanup();

    // A configuration that names no grid columns keeps the twelve-column grid.
    const twelve = render(<Detail {...propsWithoutRoadFor(PINNED_CONFIGURATION)} />).container;
    const first = twelve.querySelector<HTMLElement>("[data-dashboard-tile]");
    expect(first!.parentElement!.style.gridTemplateColumns).toBe("repeat(12, minmax(0, 1fr))");
    cleanup();

    // A grid whose column count cannot be read floors by name, never as twelve.
    for (const grid of [{ cols: 0 }, { cols: "24" }, "24"]) {
      const floored = render(
        <Detail {...propsWithoutRoadFor(storedEnvelope({ grid, portlets: CONFIGURATION.portlets }))} />,
      ).container;
      const floor = floored.querySelector<HTMLElement>('[data-dashboard-artifact="floor"]');
      expect(floor?.getAttribute("data-dashboard-floor")).toBe("configuration-grid-unreadable");
      cleanup();
    }
  });

  it("hands the composition only the portlets it can draw", () => {
    const body = {
      portlets: [
        ...CONFIGURATION.portlets,
        { id: "no-place", title: "Unplaced" },
        { title: "No id", x: 0, y: 9, w: 4, h: 3 },
        null,
      ],
    };
    const { container } = render(<Detail {...props(configurationContent(storedEnvelope(body)))} />);
    const received = JSON.parse(doubles(container)[0]!.textContent ?? "null") as Record<string, unknown>;
    expect(received.config).toEqual(CONFIGURATION);
    cleanup();

    // Portlets listed, none of them drawable: a named floor, never an empty composition.
    const undrawable = { portlets: [{ id: "no-place", title: "Unplaced" }, null] };
    const floored = render(<Detail {...props(configurationContent(storedEnvelope(undrawable)))} />).container;
    expect(doubles(floored)).toHaveLength(0);
    const floor = floored.querySelector<HTMLElement>('[data-dashboard-artifact="floor"]');
    expect(floor?.getAttribute("data-dashboard-floor")).toBe("configuration-without-portlets");
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
