// The continued reading of the dashboard display (specs/app-artifact-review.html
// §XI.5, conformance id `dashboard-continued-reading`, cinatra#3092). The
// drawing puts it inside the display, after the dashboard and its reading line,
// once the review is continued: the paragraph binds `reading=review.reading`,
// declares the `empty` state, and holds the decision time's span.
//
// THE ANCHOR DRAWS NO WORDS. The drawing's sentence ("The dashboard is live from
// here.") is a claim about a remote effect, and the host hands no
// `review.effect` at this props version, so the paragraph is drawn empty and
// nothing a person can see changes. It is present in the continued reading
// only: not while the review is open, not where no review stands, and not on a
// floor.

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Detail from "../src/renderers/detail";
import type { ArtifactRendererProps } from "../src/artifact-renderer-props";
import { OPEN_LIVE, artifactWithSource, noContent, props, propsWithoutRoad } from "./props-fixture";

const DECIDED_AT = "2026-10-07T09:35:30.000Z";
const PENDING = { reading: "pending", openLive: null } as const;
const CONTINUED = { reading: "continued", openLive: OPEN_LIVE, decidedAt: DECIDED_AT } as const;
const CONTINUED_WITHOUT_TIME = { reading: "continued", openLive: OPEN_LIVE } as const;
const DISPLAY = '[data-conformance-id="dashboard-display"]';
const READING = '[data-conformance-id="dashboard-continued-reading"]';
const DECISION = '[data-field="decision=review.decidedAt"]';

const artifact = artifactWithSource();

afterEach(() => {
  cleanup();
});

describe("the continued reading of the dashboard display", () => {
  it.each([
    { name: "with the numbers read", snapshot: props(undefined, { artifact, review: CONTINUED }) },
    { name: "with no data capability", snapshot: propsWithoutRoad({ artifact, review: CONTINUED }) },
  ])("is drawn inside the display, last, once the review is continued, $name", ({ snapshot }) => {
    const { container } = render(<Detail {...snapshot} />);
    const display = container.querySelector(DISPLAY);
    expect(display).not.toBeNull();
    const readings = container.querySelectorAll(READING);
    expect(readings).toHaveLength(1);
    const reading = readings[0]!;
    expect(reading.parentElement).toBe(display);
    expect(display!.lastElementChild).toBe(reading);
    expect(reading.tagName).toBe("P");
    expect(reading.getAttribute("data-field")).toBe("reading=review.reading");
    expect(reading.getAttribute("data-state")).toBe("empty");
    expect(reading.querySelectorAll(DECISION)).toHaveLength(1);
    // Nothing a person can see: no words, and no box of its own.
    expect(reading.textContent).toBe("");
    expect((reading as HTMLElement).style.display).toBe("contents");
  });

  it.each([
    { name: "none", review: CONTINUED_WITHOUT_TIME },
    { name: "one that is not an instant", review: { ...CONTINUED, decidedAt: "not a time" } },
  ])("binds no decision time when the host handed $name", ({ review }) => {
    const { container } = render(<Detail {...props(undefined, { artifact, review })} />);
    const reading = container.querySelector(READING);
    expect(reading).not.toBeNull();
    expect(reading!.querySelector(DECISION)).toBeNull();
  });

  it.each<{ name: string; snapshot: ArtifactRendererProps }>([
    { name: "while the review is open", snapshot: props(undefined, { artifact, review: PENDING }) },
    { name: "where no review stands", snapshot: props(undefined, { artifact }) },
    { name: "while the review is open, no data capability", snapshot: propsWithoutRoad({ artifact, review: PENDING }) },
    { name: "where no review stands, no data capability", snapshot: propsWithoutRoad({ artifact }) },
    { name: "on a floor, even once continued", snapshot: props(noContent("absent"), { artifact, review: CONTINUED }) },
  ])("is not drawn $name", ({ snapshot }) => {
    const { container } = render(<Detail {...snapshot} />);
    expect(container.querySelector(DISPLAY)).not.toBeNull();
    expect(container.querySelector(READING)).toBeNull();
  });
});
