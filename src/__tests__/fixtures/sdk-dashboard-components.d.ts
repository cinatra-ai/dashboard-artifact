// Types for the shared read-only composition the host serves at
// `@cinatra-ai/sdk-dashboard/components` (cinatra#3092).
//
// WHY THIS FILE EXISTS. The host serves that one module to this package's
// display: it compiles the display from this package's source and resolves the
// specifier through its own path map. Standalone nothing resolves it, so the
// package declares the one export it consumes, with the props the display
// passes, here, for its OWN standalone `tsc` only.
//
// WHY IT LIVES UNDER `src/__tests__/fixtures/` AND NOWHERE ELSE. An ambient
// `declare module` wins over a tsconfig `paths` mapping for every file of the
// program that reads it. Inside the host this file must therefore never be part
// of the program, or it would shadow the host's REAL module. cinatra main's
// tsconfig excludes `**/__tests__/fixtures/**`, so THIS path is inside this
// package's own include (`src/**/*.ts`) and outside the host's program. It is
// also outside the published `files` set (`!src/__tests__`), so no consumer
// installing this package receives the declaration at all.
//
// WHAT THIS FILE IS NOT. Not a copy of the composition: it carries no
// implementation. Not a dependency on the specifier: a type-only ambient
// declaration adds nothing to package.json. It is a global script (no
// top-level import or export), so the declaration stays ambient.

declare module "@cinatra-ai/sdk-dashboard/components" {
  export function ReadOnlyComposedDashboard(props: {
    config: Record<string, unknown>;
    dataRoad?: { readonly road: "session"; readonly apiUrl: string };
  }): import("react").ReactElement;
}
