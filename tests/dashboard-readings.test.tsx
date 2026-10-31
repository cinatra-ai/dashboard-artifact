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
import { OPEN_LIVE, artifactWithSource, props, propsWithoutRoad } from "./props-fixture";

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
  ])("draws no link for %s", (_name, sourceUrl) => {
    const { container } = render(<Detail {...props(undefined, { artifact: artifactWithSource(sourceUrl) })} />);
    expect(container.querySelectorAll(OPEN_LIVE_BINDING)).toHaveLength(0);
  });

  it.each([
    ["a number", 42],
    ["an object", { href: OPEN_LIVE }],
    ["a boolean", true],
    ["a list holding an address", [OPEN_LIVE]],
  ])("draws no link for a sourceUrl that is %s", (_name, sourceUrl) => {
    const row = { ...artifactWithSource(), sourceUrl } as unknown as ArtifactRendererProps["artifact"];
    const { container } = render(<Detail {...props(undefined, { artifact: row })} />);
    expect(container.querySelectorAll(OPEN_LIVE_BINDING)).toHaveLength(0);
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
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
  ])("treats %s as an open review: no link", (_name, review) => {
    const snapshot = { ...props(undefined, { artifact }), review } as unknown as ArtifactRendererProps;
    const { container } = render(<Detail {...snapshot} />);
    expect(container.querySelectorAll(OPEN_LIVE_BINDING)).toHaveLength(0);
  });

  it("names the display on its floor, so the error state is the same surface", () => {
    const { container } = render(<Detail {...props(undefined, { propsApiVersion: 4 })} />);
    const floor = container.querySelector('[data-conformance-id="dashboard-display"]');
    expect(floor?.getAttribute("data-dashboard-artifact")).toBe("floor");
    expect(floor?.getAttribute("data-dashboard-floor")).toBe("props-version");
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
