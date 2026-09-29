// A TEST-ONLY DOUBLE of the shared read-only composition the host serves at
// `@cinatra-ai/sdk-dashboard/components` (cinatra#3092). vitest.config.ts
// aliases that exact id onto this file while the id does not resolve.
//
// It draws one element carrying the JSON of the props it received and nothing
// else, so a suite can read exactly what the display handed the composition.
// It is never package source and never evidence of how the real composition
// draws.

import type { ReactElement } from "react";

export function ReadOnlyComposedDashboard(props: Record<string, unknown>): ReactElement {
  return <div data-double="read-only-composed-dashboard">{JSON.stringify(props)}</div>;
}
