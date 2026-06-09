export const thorondorDocumentation = `
# Thorondor como SIEM personal

Thorondor es una consola de observabilidad y seguridad para hosts propios. El modelo base es deliberadamente simple:
cada host ejecuta un agente Python, el navegador consulta a esos agentes por HTTP y la aplicación conserva histórico en
IndexedDB. Si se activa la persistencia remota, ese mismo dataset se sincroniza con una API respaldada por base de datos
para mantener logs, alertas, reglas y agentes disponibles desde cualquier navegador.

## Componentes

- **Agente Python**: proceso HTTP ligero instalado en Linux o Windows. Expone \`/health\`, \`/telemetry\`, \`/logs\` y endpoints manuales de respuesta.
- **Frontend Vue**: registra agentes, ejecuta polling, normaliza la telemetría y pinta dashboard, detalle y alertas.
- **IndexedDB**: base local del navegador para snapshots, eventos, logs, reglas, alertas y estado de conexión.
- **Persistencia remota**: API opcional con base de datos para workspaces sincronizados.
- **Motor de reglas**: evaluación JavaScript de umbrales, heartbeat, autenticación, sudo e integridad de ficheros.
- **Empaquetado Windows**: asistente único que genera `ThorondorAgent.msi`, lo deja en el Escritorio y lo instala con `msiexec`.

## Telemetría

El payload de \`/telemetry\` se organiza en bloques estables:

- \`system\`: hostname, IP, sistema operativo, kernel, arquitectura y uptime.
- \`metrics\`: CPU, memoria, swap, discos, procesos, interfaces de red y temperaturas si el sistema las expone.
- \`security\`: logins, fallos de autenticación, sudo, usuarios nuevos y cambios en ficheros críticos.
- \`logs\`: entradas recientes de syslog, journal, kernel o rutas adicionales configuradas.
- \`heartbeat\`: timestamp de captura usado para detectar caidas o agentes congelados.

## Comunicacion

El navegador hace peticiones HTTP al endpoint registrado del agente. Ese endpoint puede ser \`127.0.0.1\`, una IP privada,
una IP de VPN, una IP pública o un FQDN. El host no llama al frontend: el flujo siempre es pull desde el navegador.
Eso reduce dependencias, pero exige conectividad directa desde el navegador al puerto o reverse proxy del agente. Si el
endpoint es público, usa allowlist de origen en firewall, TLS y un proxy frontal controlado cuando la aplicación se sirva por HTTPS.

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
