# Thorondor Front: operativa y despliegue

## Alcance

Este repositorio es el frontend independiente actual de Thorondor. La versión embebida en El Anillo queda solo como referencia histórica y no debe recibir cambios de Thorondor standalone salvo petición explícita.

Rutas locales relacionadas:

- Front local: `C:\Users\Jarva\Desktop\git-repos\front-thorondor`
- Back local: `C:\Users\Jarva\Desktop\git-repos\back-thorondor`
- Versión histórica: `C:\Users\Jarva\Desktop\git-repos\front-elanillo\src\features\vueloThorondor`

## Estado funcional

El front contiene login, registro local con código por email, recuperación de acceso, IndexedDB para cuentas no autorizadas, sincronización con BBDD automática cuando el usuario está autorizado, generador de agentes, dashboard, eventos, alertas, reglas, bloqueo de IPs, casos, auditoría, panel de usuario y consola central.

El cliente no debe saltarse la API central para demos o producción. La monitorización, consola central, panel admin y persistencia en BBDD requieren `Authorization: Bearer <jwt>` validado por el backend. Si la API central rechaza o no está configurada, el front conserva IndexedDB y no debe volver a consultar agentes directamente desde el navegador.

## Variables de entorno

Desarrollo local:

```properties
VITE_THORONDOR_API_BASE_URL=http://localhost:8088
VITE_THORONDOR_AGENT_CENTRAL_API_BASE_URL=http://localhost:8088
VITE_THORONDOR_AUTH_CALLBACK_PATH=/login/callback
VITE_THORONDOR_WORKSPACE_ID=default
```

Producción con Nginx y Cloudflare Tunnel:

```properties
VITE_THORONDOR_API_BASE_URL=/api
VITE_THORONDOR_AGENT_CENTRAL_API_BASE_URL=https://api.thorondor.app
VITE_THORONDOR_AUTH_CALLBACK_PATH=/login/callback
VITE_THORONDOR_WORKSPACE_ID=default
```

`/api` funciona para el navegador cuando Nginx sirve front y back bajo el mismo origen. El generador de agentes necesita una URL absoluta en `VITE_THORONDOR_AGENT_CENTRAL_API_BASE_URL` o en el formulario, porque el agente Python corre fuera del navegador.

## Autenticación y callbacks

El callback de frontend activo es `/login/callback`; debe coincidir con `src/router/index.ts` y con `VITE_THORONDOR_AUTH_CALLBACK_PATH`. Los proveedores OAuth deben usar callbacks públicos hacia el backend bajo el origen del front:

- `https://thorondor.app/login/oauth2/code/google`
- `https://thorondor.app/login/oauth2/code/microsoft`
- `https://thorondor.app/login/oauth2/code/github`
- `https://thorondor.app/login/oauth2/code/apple`

La UI actual solo muestra Google. El backend mantiene soporte para Microsoft, GitHub y Apple si se configuran credenciales y se reactivan en el cliente.

Tras login, el front consulta `/auth/session`, pide `/auth/token` y guarda un JWT corto propio de Thorondor en `sessionStorage` y memoria. No guardar tokens OAuth de proveedores en el navegador. La cookie `THORONDOR_SESSION` es `httpOnly` y solo sirve para la sesión OAuth y la emisión del JWT.

## Persistencia

La persistencia no se decide con una variable de entorno. La única palanca funcional es el permiso `usuario_autorizado` del backend:

- API configurada y usuario autorizado: sincronización con BBDD por API y caché IndexedDB.
- API ausente, sesión no autorizada o error de API: IndexedDB local.

El `workspaceId` visible del front se convierte en un namespace ligado al usuario JWT autorizado en el backend; `default` no se comparte entre cuentas.

Stores esperados: `agents`, `snapshots`, `logs`, `events`, `alerts`, `rules`, `history` y metadatos `lastSweepAt`, `generatorDraft`, `casesByAgent`, `smartResponses`.

## Despliegue en Servidor 2

Servidor asignado: `192.168.0.253`.

- Front servidor: `/var/www/thorondor/front`
- App front en servidor: `/var/www/thorondor/front/front-thorondor`
- Dist front: `/var/www/thorondor/front/front-thorondor/dist`
- Front LAN por Nginx: `http://192.168.0.253:444/`

Comandos actuales:

```bash
cd /var/www/thorondor/front/front-thorondor
npm install
VITE_THORONDOR_API_BASE_URL=/api VITE_THORONDOR_AGENT_CENTRAL_API_BASE_URL=https://api.thorondor.app VITE_THORONDOR_AUTH_CALLBACK_PATH=/login/callback VITE_THORONDOR_WORKSPACE_ID=default npm run build
sudo systemctl reload nginx
```

El repo remoto está anidado: no ejecutar `npm` en `/var/www/thorondor/front`, sino en `/var/www/thorondor/front/front-thorondor`.

Rutas previstas del tunnel:

```text
thorondor.app -> http://127.0.0.1:444
www.thorondor.app -> http://127.0.0.1:444
api.thorondor.app -> http://127.0.0.1:8088
```

No abrir `444` ni `8088` en el router; Cloudflare Tunnel usa conexión saliente desde el servidor.

## Agentes monitorizados

El agente generado es Python. En Linux se despliega normalmente bajo `/opt/thorondor-agent/`, con systemd si se activa autoarranque. En Windows usa `C:\ProgramData\Thorondor-Agent\` y Task Scheduler.

El modelo actual para demos y producción es:

- El front consulta `/api/thorondor/api/console/**` con JWT de usuario.
- El primer registro del agente llama a `/thorondor/api/agents/register` con `X-Thorondor-Agent-Enroll-Token` y `X-Thorondor-Agent-Token`.
- El back guarda solo `agent_secret_hash` en `thorondor_siem_agents`.
- Heartbeat, telemetría, cola de comandos y resultado de comandos exigen `X-Thorondor-Agent-Token`.
- El HTTP local del agente mantiene `/health` abierto para diagnóstico; `/telemetry`, `/logs`, `/response/blocks`, `/response/block-ip` y `/response/unblock-ip` requieren token de agente.

No abrir puertos ni reglas de firewall en hosts monitorizados sin confirmar alcance LAN/VPN/público y origen permitido.

## Google OAuth en produccion

Google OAuth quedo activado en produccion el 2026-06-25. El boton de Google se
habilita en el front con `EXTERNAL_OAUTH_ENABLED = true`, pero sigue dependiendo
de la disponibilidad real que devuelve el backend en `/auth/session` o
`/auth/providers`. Si el backend no tiene credenciales, el boton queda apagado.

La identidad funcional es el email. Si un usuario existe por registro local y
entra por Google con el mismo email, el backend reutiliza el mismo usuario
interno, de modo que los datos y permisos no dependen del metodo de acceso.

Para diagnosticar OAuth desde fuera:

```bash
curl -fsS https://thorondor.app/api/auth/providers
curl -sS -D - -o /dev/null https://thorondor.app/oauth2/authorization/google
```

La segunda respuesta debe redirigir a Google con
`redirect_uri=https://thorondor.app/login/oauth2/code/google`, sin `:444`. La
guia completa de servidor esta en
`C:\Users\Jarva\Desktop\git-repos\back-thorondor\docs\thorondor-google-oauth.md`.
