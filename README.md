# Dashboard

The generic, meaning-free dashboard artifact for the Cinatra artifact library. Every dashboard in Cinatra gets a paired artifact identity of this one type, so the library, permissions, and scope surfaces can treat dashboards as first-class artifacts — same store, no drift.

This is a system-base extension: it ships the artifact manifest and object type only. It declares the `dashboard` representation form (`accepts.dashboard`) — the formless, viewSpec-backed record the substrate already models, distinct from an uploaded file blob — and exactly one dedicated object type, `@cinatra-ai/dashboard-artifact:dashboard`. Dashboard twin rows always carry this one generic type; a dashboard's meaning (for example "web-analytics dashboard") arrives later as claim assertions minted by meaning-type `*-dashboard-artifact` packs, never as a distinct row type. The representation resource carries the published `v12`-suffixed dashboard envelope under the media type `application/vnd.cinatra.dashboard.v12+json` (envelope-versioned; drizzle-cube nested).

The extension deliberately ships no renderer or `ui` bundle — the first-party representation viewer for the dashboard media type is registered host-side — and no matcher skill, because dashboards are minted transactionally by the platform's dashboard mutation service, never classified from an upload. It exposes no HTTP endpoints and requires no API keys or external credentials; everything is handled by the Cinatra platform. The authoritative manifest is the `cinatra` block in `package.json`; the TypeScript manifest in `src/index.ts` re-declares the same descriptor and is kept in agreement by `tests/manifest.test.ts` — update both in the same commit.

## Works with

- The artifact library — open any dashboard as a first-class artifact row
- Meaning-type `*-dashboard-artifact` packs — add semantics as claim assertions
- Cinatra permissions and scope collections — govern dashboards like any artifact

## Capabilities

- Give every dashboard a first-class artifact identity in the shared object store
- Declare the `dashboard` representation form the host viewer renders
- Carry the versioned dashboard representation envelope for the host viewer
- Anchor meaning-type dashboard packs without changing the generic row type
