export const thorondorDocumentation = `
# Thorondor como SIEM personal

Thorondor es una consola de observabilidad y seguridad para hosts propios. El modelo base actual usa una API central:
cada host ejecuta un agente Python, el agente se registra contra el back con token propio y sincroniza telemetría,
logs y resultados de comandos por HTTPS. La aplicación conserva IndexedDB como caché local y, si el usuario está
autorizado, sincroniza su workspace privado con una base de datos por API.

## Componentes

- **Agente Python**: proceso instalado en Linux o Windows. Expone \`/health\` para comprobacion local y protege \`/telemetry\`, \`/logs\` y respuesta manual con token de agente.
- **Frontend Vue**: autentica al usuario, consulta la consola central con JWT y pinta dashboard, detalle y alertas.
- **IndexedDB**: base local del navegador para snapshots, eventos, logs, reglas, alertas y estado de conexión.
- **Persistencia remota**: API con base de datos para workspaces sincronizados y aislados por usuario autorizado.
- **Motor de reglas**: evaluación JavaScript de umbrales, heartbeat, autenticación, sudo e integridad de ficheros.
- **Empaquetado Windows**: asistente único que genera \`ThorondorAgent.msi\`, lo deja en el Escritorio y lo instala con \`msiexec\`.

## Telemetría

El payload de \`/telemetry\` se organiza en bloques estables:

- \`system\`: hostname, IP, sistema operativo, kernel, arquitectura y uptime.
- \`metrics\`: CPU, memoria, swap, discos, procesos, interfaces de red y temperaturas si el sistema las expone.
- \`security\`: logins, fallos de autenticación, sudo, usuarios nuevos y cambios en ficheros críticos.
- \`logs\`: entradas recientes de syslog, journal, kernel o rutas adicionales configuradas.
- \`heartbeat\`: timestamp de captura usado para detectar caidas o agentes congelados.

## Comunicacion

El navegador no debe consultar agentes directamente en despliegues reales. El front llama al back con
\`Authorization: Bearer <jwt>\`; el agente llama a \`/thorondor/api/agents/**\` con \`X-Thorondor-Agent-Token\`.
El primer registro requiere ademas \`X-Thorondor-Agent-Enroll-Token\`. Si se usa Cloudflare Tunnel, front y API deben ir
por HTTPS y los puertos locales de agentes no deben abrirse a Internet salvo con firewall restrictivo.

## Persistencia y retención

Thorondor guarda solo datos operativos: agentes registrados, snapshots resumidos, eventos, logs recientes, reglas,
alertas y conexiones. En modo local se conservan en IndexedDB y la purga automatica evita que el navegador crezca sin
control. En modo sincronizado se guardan también en la base de datos del workspace y se mantiene IndexedDB como caché
local para que el panel pueda seguir funcionando aunque haya un corte temporal de red.

## Limites

- No sustituye a un SIEM empresarial multiusuario.
- No hace respuesta automatica tipo EDR salvo reglas explicitas que se configuren para ello; el bloqueo manual siempre debe poder revertirse desde el front.
- La centralizacion fuera del navegador solo existe cuando el workspace activa persistencia remota.
- No expongas un agente en Internet sin TLS cuando corresponda, proxy frontal y controles de red adicionales.

## Uso recomendado

Empieza con un solo host, genera el instalador único, valida \`/health\` y \`/telemetry\`, registra el agente en el dashboard y ajusta reglas. Cuando
el primer flujo sea estable, replica el agente en el resto de sistemas y usa la vista de reglas para adaptar umbrales al
rol de cada maquina.
`;
