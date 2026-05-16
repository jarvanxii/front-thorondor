# Thorondor

Frontend Vue de Thorondor, extraido desde El Anillo como aplicacion independiente.

Incluye:

- Vistas de informacion, guia, generador de agentes, dashboard, detalle de hosts, reglas, bloqueo de IPs, auditoria de comandos y agentes.
- Estado Vuex con persistencia IndexedDB y capa opcional de sincronizacion con base de datos.
- Assets, favicons, tema visual y navegacion secundaria propios de Thorondor.
- Integracion con Bootstrap CSS, Marked y Chart.js por CDN.

## Setup

```sh
npm install
```

## Desarrollo

```sh
npm run dev
```

## Autenticacion

Thorondor ya incluye pantalla de login, acceso local temporal y botones de acceso con Google, Microsoft, GitHub y Apple.

Configura la API en `.env` a partir de `.env.example`:

```sh
VITE_THORONDOR_API_BASE_URL=http://localhost:3000
VITE_THORONDOR_AUTH_CALLBACK_PATH=/#/auth/callback
```

El frontend redirige a estos endpoints de la API:

- `/auth/oauth/google`
- `/auth/oauth/microsoft`
- `/auth/oauth/github`
- `/auth/oauth/apple`

Cada redireccion envia `flow=web`, `return_to` con la ruta de callback del frontend y `remember_device` cuando el usuario lo marque. La API debe generar `state`/`nonce`, aplicar PKCE cuando corresponda, guardar secretos en servidor, intercambiar el codigo con el proveedor, crear la sesion y devolver al frontend con cookie `httpOnly`, `Secure` y `SameSite`.

## Persistencia de datos

Thorondor mantiene dos modos:

- `local`: todo queda en IndexedDB del navegador.
- `cloud`: el frontend sincroniza con una API respaldada por base de datos y conserva IndexedDB como cache local.

Variables:

```sh
VITE_THORONDOR_PERSISTENCE_MODE=local
VITE_THORONDOR_WORKSPACE_ID=default
```

Cuando `VITE_THORONDOR_PERSISTENCE_MODE=cloud`, la API debe exponer:

- `GET /thorondor/workspaces/:workspaceId/dataset`
- `PUT /thorondor/workspaces/:workspaceId/dataset`
- `POST /thorondor/workspaces/:workspaceId/records/:storeName/bulk`
- `DELETE /thorondor/workspaces/:workspaceId/records/:storeName/:key`
- `DELETE /thorondor/workspaces/:workspaceId/records/:storeName?index=agentId&value=:agentId`
- `DELETE /thorondor/workspaces/:workspaceId/records/:storeName`
- `PUT /thorondor/workspaces/:workspaceId/meta/:key`
- `POST /thorondor/workspaces/:workspaceId/retention/sweep`

Stores esperados: `agents`, `snapshots`, `logs`, `events`, `alerts`, `rules`, `history` y metadatos `lastSweepAt`, `generatorDraft`, `casesByAgent`.

## Build

```sh
npm run build
```

## Lint

```sh
npm run lint
```

## E2E

```sh
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

Por defecto Playwright usa el puerto `5174` para evitar reutilizar por error otros servidores Vite locales. Se puede cambiar con `THORONDOR_E2E_PORT`.
