# Repository Guidelines

## Project Structure & Module Organization
Thorondor standalone lives in this repo. Do not edit the historical embedded copy under `front-elanillo` unless the user explicitly asks for it. The app entry points are `src/main.ts`, `src/router/index.ts`, and `src/App.vue`. Feature screens live in `src/views/Thorondor/`; shared Thorondor UI is in `src/components/Thorondor/` plus the top header/sidebar components. Domain data and client services live under `src/features/thorondor/`, with persistence split between IndexedDB, authorized workspace sync, central SIEM API, auth, generator, rules, smart responses, and formatters.

## Build, Test, and Development Commands
Use the scripts defined in `package.json`:

```powershell
npm install
npm run dev
npm run build
npm run test:unit
npm run test:e2e -- --project=chromium
npm run lint
npm run format
```

Playwright starts Vite on `5174` by default; override it with `THORONDOR_E2E_PORT`. For a single E2E file use `npm run test:e2e -- --project=chromium e2e/thorondor.spec.ts`.

## Coding Style & Naming Conventions
The project uses Vue 3, Vite, TypeScript, Vue Router, Vuex, Pinia, Vitest, and Playwright. Prettier is configured with no semicolons, single quotes, and `printWidth` 100. ESLint combines Vue, Vue TS, Vitest, Playwright, Oxlint, and Prettier compatibility; Oxlint treats correctness as errors. `tsconfig.app.json` enables `noUncheckedIndexedAccess`, so index access must handle missing values.

## Testing Guidelines
Vitest runs in `jsdom` and excludes `e2e/**`. Playwright tests live in `e2e/`; install Chromium with `npx playwright install chromium` before first local E2E runs.

## Agent Instructions
This frontend is the current UI reference. In production with Nginx/Cloudflare Tunnel, use `VITE_THORONDOR_API_BASE_URL=/api` and an absolute `VITE_THORONDOR_AGENT_CENTRAL_API_BASE_URL` for generated Python agents. The frontend currently exposes Google OAuth in the UI; the backend can support additional providers when configured and re-enabled in the client. Persistence is not selected by an env flag: `usuario_autorizado` in the backend is the switch. Authorized users with API access sync to the server; every other account stays in IndexedDB.
