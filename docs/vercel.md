# Deploying Landshift on Vercel

Vercel hosts the Vite frontend, geographic assets, and Node.js community-chat API in one project. No separate application server or database is required. OpenRouter provides live dialogue; Cesium ion supplies the optional photorealistic view.

## Project setup

1. Import this Git repository into Vercel and select the repository root as the Root Directory.
2. Use Node.js **24.x**. The repository's `vercel.json` selects Vite, runs `npm run build:vercel`, and serves `dist`.
3. Add these environment variables for each deployment environment you use, including Preview and Production:

   | Variable                | Purpose                                                                                                                                                                                                                   |
   | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `OPENROUTER_API_KEY`    | Server-only OpenRouter key for live community dialogue. Never give it a `VITE_` prefix.                                                                                                                                   |
   | `OPENROUTER_MODEL`      | Optional Gemini model ID. Defaults to `google/gemini-2.5-flash-lite`.                                                                                                                                                     |
   | `VITE_CESIUM_ION_TOKEN` | Optional browser-visible, read-only ion token for photorealistic 3D. Restrict it to the deployed domains and enable Google Photorealistic 3D Tiles in ion. Local imagery and terrain remain available without this token. |

4. Deploy. Changes to the browser-visible Cesium token require a new build. If the OpenRouter key is absent, the game uses its authored demo replies.

Do not run `vite preview` as a production server, set a custom Start Command, or add an SPA catch-all rewrite. Both `/` and `/game.html` are real build entry points, and `/api/community` and `/api/community/status` are function routes.

## Geographic assets

`public/data/` is intentionally ignored by Git. On Vercel, `postinstall` prepares packs before API dependency tracing; `build:vercel` also ensures they exist before the frontend build. Ordinary local installs skip this preparation. The deployment preparation script handles both `golden-gate-park` (also used by the Polo Fields demo) and `san-jose-dc04`:

- Reuse a prepared local pack, or restore a previously verified pack from `node_modules/.cache/landshift-data/` when Vercel's dependency cache is available.
- If a pack is missing, run its existing public-data preparation script and generate the Cesium heightmap. The first uncached build needs internet access to the documented public GIS, imagery, elevation, and map sources. These are build-time downloads; no additional asset host is required at runtime.
- Verify every artifact's size and SHA-256, geographic geometry, imagery, and tile coverage. A missing or corrupt artifact fails the build.
- Cache the verified packs. Changes to preparation code, geometry utilities, or the dependency lockfile select a new cache directory. To deliberately refresh upstream snapshots, clear the Vercel build cache before rebuilding.

A cold build obtains current public exports and records their provenance in the generated pack manifests; it does not reproduce the team's ignored raw-download cache. If the upstream services are unavailable, retry the build after they recover. Prepared packs are about 69 MiB combined, plus the app's textures, models, and Cesium assets. They are built on Vercel rather than uploaded as repository source files.

The static build copies all runtime assets into `dist`. `vercel.json` also includes the specific GeoJSON collections read by the API in the Node function bundles. The backend reads them from `public/data/` relative to the function's working directory. The Polo Fields chat uses its authored baseline directly.

## API behavior

`api/community.ts` and `api/community/status.ts` expose Web-standard request handlers on Vercel's Node.js runtime. Local Vite development and preview adapt Node HTTP requests to the same shared handler. Both deployments retain bounded request bodies, schema validation, same-origin checks, server-side geographic assessment, abort signals, and uncached responses. Vercel request cancellation is enabled so disconnects can abort provider calls. The function timeout is 60 seconds; the existing provider timeout is 20 seconds with no automatic retries. TypeScript rewrites relative `.ts` imports to `.js` when Vercel emits function code.

The API permits two active requests and 30 requests per minute **per warm process**. The minute budget resets automatically; there is no lifetime cap that requires restarting a function. These in-memory limits are not a deployment-wide spending limit: multiple instances each have their own counters. For a public release, configure rate limiting on `/api/community` in Vercel Firewall and set an OpenRouter key budget appropriate to the demo.

Conversations remain in the player's browser session. The API does not write files or persist chat state.

## Local verification

```sh
npm ci
npm run build:vercel
npm run check
npm test
npm run preview
```

Check `/`, `/game.html?scenario=golden-gate-polo`, `/game.html?scenario=golden-gate-park`, and `/game.html?scenario=san-jose-dc04`. `GET /api/community/status` should return JSON with configuration presence and the model name, never a key. With a server key configured in `.env.local`, submit a private message and a public discussion round. Stop the preview server afterward.

After deploying, repeat those checks on the deployment URL. The local preview exercises the shared handler; it does not emulate Vercel's CDN, function routing, or domain restrictions on third-party tokens.

Reference: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), and [including files in functions](https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions).
