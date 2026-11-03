// @vitest-environment node
// The display hands the shared read-only composition a configuration of the
// type the host's composition requires (cinatra#3092). The host's composition
// passes its `config` to drizzle-cube's DashboardProvider, typed
// `DashboardConfig`; src/__tests__/fixtures/sdk-dashboard-components.d.ts
// states the part of it that is required. This suite compiles the package's own
// program with the package's own tsconfig and reads the diagnostics of the
// display and its resolver: a looser configuration is a type error here, as it
// is when the host compiles the display.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECKED = ["src/renderers/detail.tsx", "src/dashboard-view.ts"].map((file) => resolve(root, file));

function diagnosticsOfTheDisplay(): string[] {
  const configPath = resolve(root, "tsconfig.json");
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, root);
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: { ...parsed.options, noEmit: true } });
  return ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.file !== undefined && CHECKED.includes(resolve(diagnostic.file.fileName)))
    .map((diagnostic) => {
      const { line } = diagnostic.file!.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
      const text = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n").split("\n")[0];
      return `${diagnostic.file!.fileName.slice(root.length + 1)}:${line + 1} TS${diagnostic.code} ${text}`;
    });
}

describe("the configuration the display hands the composition", () => {
  it("compiles against the composition's required DashboardConfig", () => {
    expect(diagnosticsOfTheDisplay()).toEqual([]);
  }, 60_000);
});
