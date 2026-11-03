// The one Open live dashboard link (specs/app-artifact-review.html §XI.5), drawn
// by the reading line and the no-series reading, with the binding and the action
// the drawing puts on it.

import type { ReactElement } from "react";

export default function OpenLiveLink({ href }: { href: string }): ReactElement {
  return (
    <a
      href={href}
      className="underline underline-offset-2"
      data-field="open-live=artifact.sourceUrl"
      data-action="open-live-dashboard -> dashboard-canonical"
    >
      Open live dashboard
    </a>
  );
}
