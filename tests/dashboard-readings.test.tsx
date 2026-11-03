// The six readings of the dashboard display (specs/app-artifact-review.html
// §XI.5, design@67ecd66d): "The two states compose; neither overrides the
// other. The review state alone decides the pinned marker, the settled marker
// and Open live dashboard; the data capability alone decides whether numbers
// are drawn."
//
// Each row names a reading as the drawing does. The bindings the drawing puts on
// the display are the ones the application's conformance driver looks for:
// `[data-conformance-id="dashboard-display"]`, and inside it
// `[data-field="layout=representation.pinned-configuration"]` and
// `[data-field="open-live=artifact.sourceUrl"]`.

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Detail from "../src/renderers/detail";
import type { ArtifactRendererProps } from "../src/artifact-renderer-props";
import {
  CONFIGURATION,
  OPEN_LIVE,
  artifactWithSource,
  configurationContent,
  props,
  propsWithoutRoad,
} from "./props-fixture";

const PENDING = { reading: "pending", openLive: null } as const;
const CONTINUED = { reading: "continued", openLive: OPEN_LIVE } as const;
const OPEN_LIVE_BINDING = '[data-field="open-live=artifact.sourceUrl"]';
const LAYOUT_BINDING = '[data-field="layout=representation.pinned-configuration"]';
const OPEN_LIVE_ACTION = "open-live-dashboard -> dashboard-canonical";

type Reading = {
  name: string;
  snapshot: ArtifactRendererProps;
  numbers: boolean;
  link: boolean;
};

const artifact = artifactWithSource();

const READINGS: readonly Reading[] = [
  { name: "the review open", snapshot: props(undefined, { artifact, review: PENDING }), numbers: true, link: false },
  { name: "the review continued", snapshot: props(undefined, { artifact, review: CONTINUED }), numbers: true, link: true },
  { name: "no review standing", snapshot: props(undefined, { artifact }), numbers: true, link: true },
  { name: "the review open, no data capability", snapshot: propsWithoutRoad({ artifact, review: PENDING }), numbers: false, link: false },
  { name: "the review continued, no data capability", snapshot: propsWithoutRoad({ artifact, review: CONTINUED }), numbers: false, link: true },
  { name: "no review standing, no data capability", snapshot: propsWithoutRoad({ artifact }), numbers: false, link: true },
];

afterEach(() => {
  cleanup();
});

/** An address that names credentials, put together here so that no line of this
 * file holds one for a secret scanner to try against the network. */
function addressNaming(credentials: string): string {
  return ["https:", "", `${credentials}@example.test`, "d1"].join("/");
}

describe("the six readings of the dashboard display", () => {
  it.each(READINGS)("$name", ({ snapshot, numbers, link }) => {
    const { container } = render(<Detail {...snapshot} />);
    const panels = container.querySelectorAll('[data-conformance-id="dashboard-display"]');
    expect(panels).toHaveLength(1);

    const panel = panels[0]!;
    expect(panel.querySelectorAll(LAYOUT_BINDING)).toHaveLength(1);
    expect(panel.getAttribute("data-dashboard-artifact")).toBe(numbers ? "dashboard" : "no-series");

    const bound = panel.querySelectorAll<HTMLAnchorElement>(OPEN_LIVE_BINDING);
    expect(bound).toHaveLength(link ? 1 : 0);
    expect(screen.queryAllByRole("link", { name: "Open live dashboard" })).toHaveLength(link ? 1 : 0);
    if (link) {
      expect(bound[0]!.getAttribute("href")).toBe(OPEN_LIVE);
      expect(bound[0]!.getAttribute("data-action")).toBe(OPEN_LIVE_ACTION);
    }
  });

  it("reads the address from the artifact record, never from the review reading", () => {
    render(
      <Detail
        {...props(undefined, {
          artifact: artifactWithSource("/dashboards/from-the-record"),
          review: { reading: "continued", openLive: "/dashboards/from-the-reading" },
        })}
      />,
    );
    expect(screen.getByRole("link", { name: "Open live dashboard" }).getAttribute("href")).toBe(
      "/dashboards/from-the-record",
    );
  });

  it.each([
    ["no review standing", undefined],
    ["the review continued", CONTINUED],
  ] as const)("draws no link where the record has no address: %s", (_name, review) => {
    const { container } = render(
      <Detail
        {...props(undefined, {
          artifact: artifactWithSource(null),
          ...(review === undefined ? {} : { review }),
        })}
      />,
    );
    expect(container.querySelectorAll(OPEN_LIVE_BINDING)).toHaveLength(0);
  });

  it("draws no link for an empty address, or for a snapshot with no record", () => {
    const empty = render(<Detail {...props(undefined, { artifact: artifactWithSource("") })} />);
    expect(empty.container.querySelectorAll(OPEN_LIVE_BINDING)).toHaveLength(0);
    cleanup();

    const { artifact: _row, ...withoutRow } = props();
    const missing = render(<Detail {...(withoutRow as ArtifactRendererProps)} />);
    expect(missing.container.querySelectorAll(LAYOUT_BINDING)).toHaveLength(1);
    expect(missing.container.querySelectorAll(OPEN_LIVE_BINDING)).toHaveLength(0);
  });

  // The address reaches an href, so only the two forms a live dashboard can have
  // pass: an absolute http(s) address and a root-relative path.
  it.each([
    "/dashboards/d1",
    "http://example.test/dashboards/d1",
    "https://example.test/dashboards/d1",
    "HTTPS://example.test/dashboards/d1",
    "/dashboards/d1?tab=a%20b#top",
    "https://example.test",
    "https://example.test:8443/d1?a=b#top",
    "https://example.test?a=b",
    "https://example.test#top",
    "https://example.test/user@d1",
  ])("draws the link for the address %s", (sourceUrl) => {
    const { container } = render(<Detail {...props(undefined, { artifact: artifactWithSource(sourceUrl) })} />);
    expect(container.querySelector(OPEN_LIVE_BINDING)?.getAttribute("href")).toBe(sourceUrl);
  });

  it.each([
    ["javascript:", "javascript:alert(1)"],
    ["mixed-case javascript:", "JaVaScRiPt:alert(1)"],
    ["data:", "data:text/html,<p>x</p>"],
    ["another scheme", "ftp://example.test/d1"],
    ["protocol-relative", "//example.test/d1"],
    ["a backslash after the slash", "/\\example.test/d1"],
    ["a tab inside the slashes", "/\t/example.test/d1"],
    ["a leading space", " https://example.test/d1"],
    ["a leading space before javascript:", " javascript:alert(1)"],
    ["a scheme with no slashes", "https:example.test/d1"],
    ["an address that does not parse", "https://"],
    ["a bare word", "dashboards/d1"],
    ["a space inside a path", "/dashboards/a b"],
    ["a delete character", "/dashboards/d1\u007f"],
    ["a C1 control character", "/dashboards/d1\u0080"],
    ["a no-break space", "/dashboards/a\u00a0b"],
    ["an em space", "/dashboards/a\u2003b"],
    ["a letter outside ASCII", "/dashboards/caf\u00e9"],
    ["an angle bracket", "/dashboards/<d1>"],
    ["a double quote", '/dashboards/"d1"'],
    ["a backslash in an absolute address", "https:\\\\example.test/d1"],
    ["three slashes after the scheme", "https:///example.test/d1"],
    ["a user and a password", addressNaming(["alice", "pw"].join(":"))],
    ["a user alone", addressNaming("alice")],
    ["a password alone", addressNaming(":pw")],
    ["an empty user part", addressNaming("")],
    ["an empty user and password", addressNaming(":")],
    ["an empty address", ""],
    ["an empty host with a port", "https://:80/d1"],
    ["a host that does not parse", "https://[/d1"],
  ])("draws no link for %s", (_name, sourceUrl) => {
    const { container } = render(<Detail {...props(undefined, { artifact: artifactWithSource(sourceUrl) })} />);
    expect(container.querySelectorAll(OPEN_LIVE_BINDING)).toHaveLength(0);
  });

  it.each([
    ["a number", 42],
    ["an object", { href: OPEN_LIVE }],
    ["a boolean", true],
    ["a list holding an address", [OPEN_LIVE]],
    ["undefined", undefined],
    ["null", null],
  ])("draws no link for a sourceUrl that is %s", (_name, sourceUrl) => {
    const row = { ...artifactWithSource(), sourceUrl } as unknown as ArtifactRendererProps["artifact"];
    const { container } = render(<Detail {...props(undefined, { artifact: row })} />);
    expect(container.querySelectorAll(OPEN_LIVE_BINDING)).toHaveLength(0);
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
    ["a string", "5"],
    ["absent", undefined],
  ])("floors a props version that is %s", (_name, propsApiVersion) => {
    const snapshot = { ...props(), propsApiVersion } as unknown as ArtifactRendererProps;
    const { container } = render(<Detail {...snapshot} />);
    const floor = container.querySelector('[data-conformance-id="dashboard-display"]');
    expect(floor?.getAttribute("data-dashboard-floor")).toBe("props-version");
  });

  it.each([
    ["a reading it does not know", { reading: "settled", openLive: OPEN_LIVE }],
    ["a review that is not an object", "continued"],
    ["a null review", null],
    ["an empty review", {}],
  ])("treats %s as an open review: no link", (_name, review) => {
    const snapshot = { ...props(undefined, { artifact }), review } as unknown as ArtifactRendererProps;
    const { container } = render(<Detail {...snapshot} />);
    expect(container.querySelectorAll(OPEN_LIVE_BINDING)).toHaveLength(0);
  });

  it("draws an empty bar under each em dash of the no-series reading", () => {
    const { container } = render(<Detail {...propsWithoutRoad({ artifact })} />);
    const tiles = Array.from(container.querySelectorAll("[data-dashboard-tile]"));
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      expect(tile.lastElementChild?.getAttribute("aria-hidden")).toBe("true");
      expect(tile.lastElementChild?.textContent).toBe("");
    }
  });

  it("names the display and its kind on its floor", () => {
    const { container } = render(<Detail {...props(undefined, { propsApiVersion: 4 })} />);
    const floor = container.querySelector('[data-conformance-id="dashboard-display"]');
    expect(floor?.getAttribute("data-kind")).toBe("artifact");
    expect(floor?.getAttribute("data-dashboard-artifact")).toBe("floor");
    expect(floor?.getAttribute("data-dashboard-floor")).toBe("props-version");
  });

  it.each(READINGS)("carries the artifact kind and no display state: $name", ({ snapshot }) => {
    const { container } = render(<Detail {...snapshot} />);
    const panel = container.querySelector('[data-conformance-id="dashboard-display"]');
    expect(panel?.getAttribute("data-kind")).toBe("artifact");
    expect(panel?.hasAttribute("data-display-state")).toBe(false);
  });

  it.each([
    ["no id", { id: undefined }],
    ["an empty id", { id: "" }],
    ["an id that is a number", { id: 1 }],
    ["no title", { title: undefined }],
    ["an empty title", { title: "" }],
    ["a title that is a number", { title: 1 }],
    ["x below 0", { x: -1 }],
    ["x not whole", { x: 1.5 }],
    ["x a string", { x: "0" }],
    ["no x", { x: undefined }],
    ["y below 0", { y: -1 }],
    ["y not whole", { y: 1.5 }],
    ["no y", { y: undefined }],
    ["w of 0", { w: 0 }],
    ["w not whole", { w: 1.5 }],
    ["no w", { w: undefined }],
    ["h of 0", { h: 0 }],
    ["h not whole", { h: 1.5 }],
    ["no h", { h: undefined }],
  ])("floors a configuration with a portlet of %s", (_name, change) => {
    const portlets = [{ ...CONFIGURATION.portlets[0]!, ...change }, CONFIGURATION.portlets[1]!];
    const { container } = render(<Detail {...props(configurationContent({ portlets }))} />);
    const floor = container.querySelector('[data-conformance-id="dashboard-display"]');
    expect(floor?.getAttribute("data-dashboard-floor")).toBe("configuration-portlet-unreadable");
  });

  it.each([
    ["null", null],
    ["a string", "portlet"],
    ["a list", [CONFIGURATION.portlets[0]]],
  ])("floors a configuration with a portlet entry that is %s", (_name, entry) => {
    const portlets = [entry, CONFIGURATION.portlets[1]!];
    const { container } = render(<Detail {...props(configurationContent({ portlets }))} />);
    const floor = container.querySelector('[data-conformance-id="dashboard-display"]');
    expect(floor?.getAttribute("data-dashboard-floor")).toBe("configuration-portlet-unreadable");
  });

  it("floors two portlets with one id", () => {
    const portlets = [CONFIGURATION.portlets[0]!, { ...CONFIGURATION.portlets[1]!, id: CONFIGURATION.portlets[0]!.id }];
    const { container } = render(<Detail {...props(configurationContent({ portlets }))} />);
    const floor = container.querySelector('[data-conformance-id="dashboard-display"]');
    expect(floor?.getAttribute("data-dashboard-floor")).toBe("configuration-portlet-unreadable");
  });

  it("draws the smallest place and size the rule allows", () => {
    const portlets = [{ id: "p", title: "Small", x: 0, y: 0, w: 1, h: 1 }];
    const { container } = render(<Detail {...propsWithoutRoad({ content: configurationContent({ portlets }) })} />);
    const tile = container.querySelector<HTMLElement>("[data-dashboard-tile]");
    expect(tile?.style.gridColumn).toBe("1 / span 1");
    expect(tile?.style.gridRow).toBe("1 / span 1");
  });

  it("spans a tile past the grid over the whole row, and cuts a wide one at the edge", () => {
    const portlets = [
      { id: "past", title: "Past", x: 12, y: 0, w: 4, h: 1 },
      { id: "wide", title: "Wide", x: 10, y: 1, w: 4, h: 1 },
    ];
    const { container } = render(<Detail {...propsWithoutRoad({ content: configurationContent({ portlets }) })} />);
    const tiles = Array.from(container.querySelectorAll<HTMLElement>("[data-dashboard-tile]"));
    expect(tiles.map((tile) => tile.style.gridColumn)).toEqual(["1 / -1", "11 / span 2"]);
  });

  it.each([
    ["a null apiVersion", { apiVersion: null, portlets: CONFIGURATION.portlets }],
    ["a number apiVersion", { apiVersion: 1.2, portlets: CONFIGURATION.portlets }],
  ])("floors a configuration with %s", (_name, configuration) => {
    const { container } = render(<Detail {...props(configurationContent(configuration))} />);
    const floor = container.querySelector('[data-conformance-id="dashboard-display"]');
    expect(floor?.getAttribute("data-dashboard-floor")).toBe("configuration-without-portlets");
  });

  it("reads a configuration that names no apiVersion as the body itself", () => {
    const { container } = render(<Detail {...props(configurationContent(CONFIGURATION))} />);
    expect(container.querySelector('[data-dashboard-artifact="dashboard"]')).not.toBeNull();
  });

  it.each([
    ["a list", ["not an object"]],
    ["a string", "not an object"],
    ["null", null],
  ])("floors a configuration that is %s", (_name, configuration) => {
    const { container } = render(<Detail {...props(configurationContent(configuration))} />);
    const floor = container.querySelector('[data-conformance-id="dashboard-display"]');
    expect(floor?.getAttribute("data-dashboard-floor")).toBe("configuration-not-object");
  });

  it.each([
    ["not an object", "session"],
    ["another road", { road: "island", apiUrl: "/api/cube" }],
    ["no address", { road: "session" }],
    ["an empty address", { road: "session", apiUrl: "" }],
    ["an address that is a number", { road: "session", apiUrl: 1 }],
  ])("draws the no-series reading for a data road that is %s", (_name, data) => {
    const snapshot = { ...props(), data } as unknown as ArtifactRendererProps;
    const { container } = render(<Detail {...snapshot} />);
    expect(container.querySelector('[data-dashboard-artifact="no-series"]')).not.toBeNull();
  });

  // "A display draws no typed sentence when a fact it needs is missing. A
  // decision alone does not establish a remote effect." The host hands no
  // effect record at this props version, so the continuation is not drawn.
  it("draws no continuation sentence: the host hands no effect record", () => {
    const { container } = render(<Detail {...props(undefined, { artifact, review: CONTINUED })} />);
    expect(container.textContent ?? "").not.toContain("live from here");
    expect(container.querySelector('[data-conformance-id="dashboard-continued-reading"]')).toBeNull();
  });
});
