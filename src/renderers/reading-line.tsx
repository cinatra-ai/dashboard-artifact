"use client";
// The reading line under the dashboard (cinatra#3092): it says that the
// configuration is frozen at the pinned revision and that the numbers are
// current, as of the reader's own local time. The time is stamped ONCE, when
// the line mounts in the reader's browser beside the data road it was handed,
// so the server never writes a time.
//
// cinatra#3092, acceptance 6: the live-dashboard navigation is absent in the
// pending reading and present in the continued one. The line draws the one
// link only when it is handed an address, which the view resolver hands it only
// in the continued reading.

import { useEffect, useState, type ReactElement } from "react";

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
          <a href={openLive} className="underline underline-offset-2">
            Open live dashboard
          </a>
        </>
      ) : null}
    </p>
  );
}
