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
VITE_THORONDOR_API_BASE_URL=http://localhost:18080
VITE_THORONDOR_AUTH_CALLBACK_PATH=/auth/callback
```

En produccion con Nginx o Cloudflare Tunnel bajo el mismo origen, usa el proxy del servidor:

```sh
VITE_THORONDOR_API_BASE_URL=/api
```

El frontend redirige a estos endpoints de la API:

- `/auth/oauth/google`
- `/auth/oauth/microsoft`
- `/auth/oauth/github`
- `/auth/oauth/apple`
- `/auth/session`
- `/auth/providers`
- `/auth/token`
- `/auth/logout`

Cada redireccion envia `flow=web`, `return_to` con la ruta de callback del frontend y `remember_device` cuando el usuario lo marque. La API conserva secretos en servidor, intercambia el codigo con el proveedor, crea la sesion y devuelve al frontend con la cookie `THORONDOR_SESSION` `httpOnly`. Despues el frontend pide `/auth/token` y usa `Authorization: Bearer <jwt>` para persistencia cloud, panel admin y consola central. En produccion con Cloudflare Tunnel usa HTTPS publico, `THORONDOR_AUTH_COOKIE_SECURE=true` y `THORONDOR_AUTH_COOKIE_SAME_SITE=None` si front y API quedan en hostnames distintos.

Los usuarios OAuth nacen con `usuario_admin=false` y `usuario_autorizado=false`. Solo los usuarios admin ven el panel admin en ajustes. Desde ese panel se puede autorizar a otros usuarios para persistencia en BBDD por API; los no autorizados quedan forzados a IndexedDB aunque `VITE_THORONDOR_PERSISTENCE_MODE=cloud`. La monitorizacion y las acciones sobre hosts requieren JWT validado por la API; una cuenta sin token puede entrar a ver la aplicacion, pero no puede consultar hosts ni encolar comandos.

Los callbacks OAuth registrados en cada proveedor deben apuntar al back publico:

- `https://<api-publica>/login/oauth2/code/google`
- `https://<api-publica>/login/oauth2/code/microsoft`
- `https://<api-publica>/login/oauth2/code/github`
- `https://<api-publica>/login/oauth2/code/apple`

## Persistencia de datos

Thorondor mantiene dos modos:

- `local`: todo queda en IndexedDB del navegador.
- `cloud`: el frontend sincroniza con una API respaldada por base de datos y conserva IndexedDB como cache local.

Variables:

```sh
VITE_THORONDOR_PERSISTENCE_MODE=local
VITE_THORONDOR_WORKSPACE_ID=default
```

Cuando `VITE_THORONDOR_PERSISTENCE_MODE=cloud`, la API expone:

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
