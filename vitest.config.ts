import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// jsdom so the dashboard display can mount into a real DOM and the suites can
// assert on what it draws. The automatic JSX runtime matches the tsconfig
// `jsx: "react-jsx"`. The manifest suite carries its own node pragma.
//
// `@cinatra-ai/sdk-dashboard/components` is the shared read-only composition
// the host serves to this package's display (cinatra#3092). The host resolves
// it for the display it compiles from this package's source through its own
// path map; standalone nothing resolves it, so the display suite could not load
// its subject at all. The id is aliased to a test-only double that lives
// OUTSIDE src/ (tests/doubles/), so it is never package source and never a
// tsconfig input (this package's tsconfig includes src/** only).
//
// The alias matches the EXACT id and nothing else: the package root and every
// other subpath of it stay unresolved here, exactly as the host admits the one
// specifier and not the package. It applies ONLY while the specifier does not
// resolve by node resolution; should a real package ever resolve under this id,
// the alias drops out on its own and the double goes inert. A green run against
// the double is never evidence that the real composition draws the same way.
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function resolvableOrDouble(specifier: string, doubleFile: string) {
  try {
    require.resolve(specifier);
    return [];
  } catch {
    return [
      {
        find: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
        replacement: path.join(here, "tests", "doubles", doubleFile),
      },
    ];
  }
}

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    alias: [
      ...resolvableOrDouble("@cinatra-ai/sdk-dashboard/components", "sdk-dashboard-components.tsx"),
    ],
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
