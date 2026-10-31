"use client";
// The reading line under the dashboard (cinatra#3092): it says that the
// configuration is frozen at the pinned revision and that the numbers are
// current, as of the reader's own local time. The time is stamped ONCE, when
// the line mounts in the reader's browser beside the data road it was handed,
// so the server never writes a time.
//
// The line draws the one live-dashboard link only when it is handed an address,
// which the view resolver hands it unless a review is still open.

import { useEffect, useState, type ReactElement } from "react";

import OpenLiveLink from "./open-live-link";

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/** The reader's local time, 24-hour, two digits each. */
export function localClock(now: Date): string {
  return `${twoDigits(now.getHours())}:${twoDigits(now.getMinutes())}`;
}

export default function ReadingLine({ openLive }: { openLive: string | null }): ReactElement {
  const [stamp, setStamp] = useState<string | null>(null);
  useEffect(() => {
    setStamp(localClock(new Date()));
  }, []);

  return (
    <p className="mt-3 text-xs text-muted-foreground" data-dashboard-reading-line="">
      <span data-dashboard-reading="">
        {"Configuration frozen at this revision · numbers as of "}
        <time>{stamp ?? ""}</time>
        {" today."}
      </span>
      {openLive !== null ? (
        <>
          {" "}
          <OpenLiveLink href={openLive} />
        </>
      ) : null}
    </p>
  );
}
