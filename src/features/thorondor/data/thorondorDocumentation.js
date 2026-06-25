export const thorondorDocumentation = `
# Thorondor como SIEM personal

Thorondor es una consola de observabilidad y seguridad para hosts propios. El modelo base actual usa una API central:
cada host ejecuta un agente Python, el agente se registra contra el back con key agents propia y sincroniza telemetría,
logs y resultados de comandos por HTTPS. La aplicación conserva IndexedDB como caché local y, si el usuario está
autorizado, sincroniza su workspace privado con una base de datos por API.

## Componentes

- **Agente Python**: proceso instalado en Linux o Windows. Expone \`/health\` para comprobación local y protege \`/telemetry\`, \`/logs\` y respuesta manual con key agents.
- **Frontend Vue**: autentica al usuario, consulta la consola central con JWT y pinta dashboard, detalle y alertas.
- **IndexedDB**: base local del navegador para snapshots, eventos, logs, reglas, alertas y estado de conexión.
- **Persistencia remota**: API con base de datos para workspaces sincronizados y aislados por usuario autorizado.
- **Motor de reglas**: evaluación JavaScript de umbrales, heartbeat, autenticación, sudo e integridad de ficheros.
- **Instalador Windows**: \`thorondor-installer.ps1\` solicita permisos de administrador, crea \`C:\\ProgramData\\Thorondor-Agent\`, prepara un venv, registra la tarea \`ThorondorAgent\`, abre el puerto del agente y deja desinstalador.
- **Instalador Linux**: \`thorondor-installer.sh\` crea \`/opt/thorondor-agent\`, prepara dependencias, habilita systemd, valida \`/health\` y deja desinstalador.

## Telemetría

El payload de \`/telemetry\` se organiza en bloques estables:

- \`system\`: hostname, IP, sistema operativo, kernel, arquitectura y uptime.
- \`metrics.hostProfile\`: FQDN, dominio o grupo de trabajo, arranque, zona horaria, virtualización, gestores de paquetes, seguridad local, rutas y resumen de exposición.
- \`metrics\`: CPU, memoria, swap, discos, procesos, interfaces de red, servicios, tareas, firewall, actualizaciones y sensores si el sistema los expone.
- \`security\`: logins, fallos de autenticación, sudo, usuarios nuevos y cambios en ficheros críticos.
- \`logs\`: entradas recientes de syslog, journal, kernel o rutas adicionales configuradas.
- \`heartbeat\`: timestamp de captura usado para detectar caídas o agentes congelados.

## Comunicación

El navegador no debe consultar agentes directamente en despliegues reales. El front llama al back con
\`Authorization: Bearer <jwt>\`; el agente llama a \`/thorondor/api/agents/**\` con \`X-Thorondor-Key-Agents\`.
El primer registro requiere además \`X-Thorondor-Agent-Enroll-Token\`. Si se usa Cloudflare Tunnel, front y API deben ir
por HTTPS y los puertos locales de agentes no deben abrirse a Internet salvo con firewall restrictivo.

## Persistencia y retención

Thorondor guarda solo datos operativos: agentes registrados, snapshots resumidos, eventos, logs recientes, reglas,
alertas y conexiones. Las cuentas sin autorización conservan esos datos en IndexedDB y la purga automática evita que el
navegador crezca sin control. Las cuentas autorizadas sincronizan su workspace con la base de datos del servidor y
mantienen IndexedDB como caché local para que el panel pueda seguir funcionando aunque haya un corte temporal de red.

## Límites

- No sustituye a un SIEM empresarial multiusuario.
- La respuesta automática se controla desde Respuesta Inteligente: solo actúa con políticas explícitas, cooldown y auditoría; los bloqueos deben poder revertirse desde el front.
- La centralización fuera del navegador solo existe para cuentas autorizadas y con API disponible.
- No expongas un agente en Internet sin TLS cuando corresponda, proxy frontal y controles de red adicionales.

## Uso recomendado

Empieza con un solo host, genera \`thorondor-installer\`, valida \`/health\` y \`/telemetry\`, registra el agente en el dashboard y ajusta reglas. Cuando
el primer flujo sea estable, replica el agente en el resto de sistemas y usa la vista de reglas para adaptar umbrales al
rol de cada máquina.
`;
