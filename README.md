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

Thorondor ya incluye pantalla de login, registro local con codigo por email y botones de acceso con Google, Microsoft, GitHub y Apple.

Configura la API en `.env` a partir de `.env.example`:

```sh
VITE_THORONDOR_API_BASE_URL=http://localhost:8088
VITE_THORONDOR_AGENT_CENTRAL_API_BASE_URL=http://localhost:8088
VITE_THORONDOR_AUTH_CALLBACK_PATH=/login/callback
```

En produccion con Nginx o Cloudflare Tunnel bajo el mismo origen, usa el proxy del servidor:

```sh
VITE_THORONDOR_API_BASE_URL=/api
VITE_THORONDOR_AGENT_CENTRAL_API_BASE_URL=https://api.thorondor.app
```

Despliegue previsto:

- Nginx sirve el front compilado en `127.0.0.1:444`.
- La API Spring Boot escucha en `127.0.0.1:8088`.
- Cloudflare Tunnel publica `thorondor.app` y `www.thorondor.app` contra el front.
- `api.thorondor.app` apunta a la API para agentes y llamadas externas directas.
- No abrir `444` ni `8088` en el router; `cloudflared` crea la salida hacia Cloudflare.

El frontend redirige a estos endpoints de la API:

- `/auth/local/signup/start`
- `/auth/local/signup/confirm`
- `/auth/local/login`
- `/auth/oauth/google`
- `/auth/oauth/microsoft`
- `/auth/oauth/github`
- `/auth/oauth/apple`
- `/auth/session`
- `/auth/providers`
- `/auth/token`
- `/auth/logout`

El registro local envia un codigo SMTP al email del usuario y crea la cuenta solo al confirmar el codigo. La cuenta nace con `usuario_admin=false` y `usuario_autorizado=false`. Cada redireccion OAuth envia `flow=web`, `return_to` con la ruta de callback del frontend y `remember_device` cuando el usuario lo marque. La API conserva secretos en servidor, intercambia el codigo con el proveedor, crea la sesion y devuelve al frontend con la cookie `THORONDOR_SESSION` `httpOnly`. Despues el frontend pide `/auth/token` y usa `Authorization: Bearer <jwt>` para persistencia cloud, panel admin y consola central. En produccion con Cloudflare Tunnel usa HTTPS publico, `THORONDOR_AUTH_COOKIE_SECURE=true` y `THORONDOR_AUTH_COOKIE_SAME_SITE=None` si front y API quedan en hostnames distintos.

Los usuarios OAuth nacen con `usuario_admin=false` y `usuario_autorizado=false`. Solo los usuarios admin ven el panel admin en ajustes. Desde ese panel se puede autorizar a otros usuarios para persistencia en BBDD por API; los no autorizados quedan forzados a IndexedDB aunque `VITE_THORONDOR_PERSISTENCE_MODE=cloud`. La monitorizacion y las acciones sobre hosts requieren JWT validado por la API; una cuenta sin token puede entrar a ver la aplicacion, pero no puede consultar hosts ni encolar comandos. Los agentes se registran en la API central con `X-Thorondor-Agent-Enroll-Token` y luego sincronizan con `X-Thorondor-Agent-Token`; el back guarda solo el hash del token por agente.

Los callbacks OAuth registrados en cada proveedor para el login web deben apuntar al origen del front:

- `https://thorondor.app/login/oauth2/code/google`
- `https://thorondor.app/login/oauth2/code/microsoft`
- `https://thorondor.app/login/oauth2/code/github`
- `https://thorondor.app/login/oauth2/code/apple`

El proxy `/api` de Nginx deja que el navegador inicie OAuth contra la API sin cambiar de origen. Usar callbacks en `api.thorondor.app` solo tiene sentido si se configura dominio de cookie compartido y CORS/cookies cross-origin de forma explicita.

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

Stores esperados: `agents`, `snapshots`, `logs`, `events`, `alerts`, `rules`, `history` y metadatos `lastSweepAt`, `generatorDraft`, `casesByAgent`. El `workspaceId` visible en el front se aisla en servidor por usuario autorizado, por lo que `default` no se comparte entre cuentas.

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
