# Thorondor

Frontend Vue de Thorondor, extraído desde El Anillo como aplicación independiente.

Incluye:

- Vistas de información, instalación con descarga de instaladores, registro de agentes, dashboard, detalle de hosts, reglas, bloqueo de IPs, auditoría de comandos y agentes.
- Estado Vuex con IndexedDB local y sincronización con base de datos solo para usuarios autorizados.
- Assets, favicons, tema visual y navegación secundaria propios de Thorondor.
- Integración con Bootstrap CSS, Marked y Chart.js por CDN.

## Setup

```sh
npm install
```

## Desarrollo

```sh
npm run dev
```

## Autenticacion

Thorondor ya incluye pantalla de login, registro local con código por email, recuperación de acceso y acceso social con Google en la UI actual. El backend puede soportar Microsoft, GitHub y Apple cuando haya credenciales y se reactiven en el cliente.

Configura la API en `.env` a partir de `.env.example`:

```sh
VITE_THORONDOR_API_BASE_URL=http://localhost:8088
VITE_THORONDOR_AGENT_CENTRAL_API_BASE_URL=http://localhost:8088
VITE_THORONDOR_AUTH_CALLBACK_PATH=/login/callback
```

En producción con Nginx o Cloudflare Tunnel bajo el mismo origen, usa el proxy del servidor:

```sh
VITE_THORONDOR_API_BASE_URL=/api
VITE_THORONDOR_AGENT_CENTRAL_API_BASE_URL=https://api.thorondor.app
VITE_THORONDOR_AUTH_CALLBACK_PATH=/login/callback
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
- `/auth/local/recovery/start`
- `/auth/local/recovery/confirm`
- `/auth/oauth/google`
- `/auth/session`
- `/auth/providers`
- `/auth/token`
- `/auth/logout`

El registro local envía un código SMTP al email del usuario y crea la cuenta solo al confirmar el código. La recuperación de acceso comprueba que el email exista en BBDD y envía un enlace de un solo uso para fijar una nueva contraseña. La cuenta nace con `usuario_admin=false` y `usuario_autorizado=false`. Cada redirección OAuth envía `flow=web`, `return_to` con la ruta de callback del frontend y `remember_device` cuando el usuario lo marque. La API conserva secretos en servidor, intercambia el código con el proveedor, crea la sesión y devuelve al frontend con la cookie `THORONDOR_SESSION` `httpOnly`. Después el frontend pide `/auth/token` y usa `Authorization: Bearer <jwt>` para persistencia en BBDD, panel admin y consola central. En producción con Cloudflare Tunnel usa HTTPS público, `THORONDOR_AUTH_COOKIE_SECURE=true` y `THORONDOR_AUTH_COOKIE_SAME_SITE=None` si front y API quedan en hostnames distintos.

Los usuarios OAuth nacen con `usuario_admin=false` y `usuario_autorizado=false`. Solo los usuarios admin ven el panel admin en ajustes. Desde ese panel se puede autorizar a otros usuarios para persistencia en BBDD por API; los no autorizados quedan forzados a IndexedDB. La monitorización y las acciones sobre hosts requieren JWT validado por la API; una cuenta sin token puede entrar a ver la aplicación, pero no puede consultar hosts ni encolar comandos. Los agentes se registran en la API central con `X-Thorondor-Agent-Enroll-Token` y luego sincronizan con `X-Thorondor-Agent-Token`; el back guarda solo el hash del token por agente.

Los callbacks OAuth registrados en cada proveedor para el login web deben apuntar al origen del front:

- `https://thorondor.app/login/oauth2/code/google`
- `https://thorondor.app/login/oauth2/code/microsoft`
- `https://thorondor.app/login/oauth2/code/github`
- `https://thorondor.app/login/oauth2/code/apple`

El proxy `/api` de Nginx deja que el navegador inicie OAuth contra la API sin cambiar de origen. Usar callbacks en `api.thorondor.app` solo tiene sentido si se configura dominio de cookie compartido y CORS/cookies cross-origin de forma explícita.

## Persistencia de datos

Thorondor decide la persistencia por autorización de usuario:

- Usuario autorizado y API disponible: sincronización con base de datos e IndexedDB como caché local.
- Usuario no autorizado, sin sesión válida o sin API disponible: todo queda en IndexedDB del navegador.

Variables:

```sh
VITE_THORONDOR_WORKSPACE_ID=default
```

No existe una variable de entorno para elegir dónde persistir: la única palanca es `usuario_autorizado` en el backend. La API expone:

- `GET /thorondor/workspaces/:workspaceId/dataset`
- `PUT /thorondor/workspaces/:workspaceId/dataset`
- `POST /thorondor/workspaces/:workspaceId/records/:storeName/bulk`
- `DELETE /thorondor/workspaces/:workspaceId/records/:storeName/:key`
- `DELETE /thorondor/workspaces/:workspaceId/records/:storeName?index=agentId&value=:agentId`
- `DELETE /thorondor/workspaces/:workspaceId/records/:storeName`
- `PUT /thorondor/workspaces/:workspaceId/meta/:key`
- `POST /thorondor/workspaces/:workspaceId/retention/sweep`

Stores esperados: `agents`, `snapshots`, `logs`, `events`, `alerts`, `rules`, `history` y metadatos `lastSweepAt`, `generatorDraft`, `casesByAgent`. El `workspaceId` visible en el front se aisla en servidor por usuario autorizado, por lo que `default` no se comparte entre cuentas.

## Documentacion operativa

Las reglas para agentes están en `AGENTS.md`. La operativa de entorno, despliegue, callback OAuth, persistencia y agentes generados está en `docs/thorondor-front-operativa.md`. La guia completa de Google OAuth en servidor esta en `C:\Users\Jarva\Desktop\git-repos\back-thorondor\docs\thorondor-google-oauth.md`.

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
