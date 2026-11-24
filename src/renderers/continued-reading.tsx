// The continued reading of the dashboard display (specs/app-artifact-review.html
// §XI.5, conformance id `dashboard-continued-reading`, cinatra#3092): the
// paragraph the drawing puts inside the display, after the dashboard and its
// reading line, once the review is continued. It binds the reading
// (`review.reading`) and declares the `empty` state; the decision time's span
// (`review.decidedAt`) is drawn inside it only when the host handed that time.
//
// IT DRAWS NO WORDS. The drawing's sentence ("The dashboard is live from here.")
// is a claim about a remote effect, and "A display draws no typed sentence when
// a fact it needs is missing" (specs/app-artifact-review.html §XI). The host
// hands no `review.effect` at this props version, so the sentence and the two
// effect spans are not drawn, and the paragraph has no box of its own
// (`display: contents`): it is the anchor of the reading, and nothing a person
// can see.

import type { ReactElement } from "react";

const READING_ID = "dashboard-continued-reading";

/** A canonical ISO instant, the one form the host hands a decision time in. */
function isInstant(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

/** The continued reading's anchor, or null in every other reading. The review
 * is read loosely, as the view resolver reads it: a shape it does not know is
 * no continued reading. */
export default function ContinuedReading({ review }: { review: unknown }): ReactElement | null {
  if (review === null || typeof review !== "object") return null;
  const { reading, decidedAt } = review as { reading?: unknown; decidedAt?: unknown };
  if (reading !== "continued") return null;
  return (
    <p
      data-conformance-id={READING_ID}
      data-field="reading=review.reading"
      data-state="empty"
      style={{ display: "contents" }}
    >
      {isInstant(decidedAt) ? <span data-field="decision=review.decidedAt" /> : null}
    </p>
  );
}
